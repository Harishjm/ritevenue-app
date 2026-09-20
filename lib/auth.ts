import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {db} from './db';
import {AUTH_COOKIE,OTP_MAX_ATTEMPTS,OTP_TTL_SECONDS,SESSION_TTL_SECONDS,clearSessionCookie,normalizeEmail,otpHash,randomOtp,randomToken,readCookie,safeReturnPath,sessionCookie,sha256,verifyOtpHash} from './auth-core';

export type AuthUser={userId:string;displayName:string;email:string;fullName:null;role:'admin'|'owner'};
type AuthEnv={RITEVENUE_ADMIN_EMAIL?:string;RITEVENUE_AUTH_SECRET?:string;RITEVENUE_AUTH_DEV_OTP?:string;RITEVENUE_DEPLOYMENT?:string;RITEVENUE_OTP_FROM_EMAIL?:string;AUTH_EMAIL?:SendEmail};
type Challenge={id:string;email:string;code_hash:string;attempts:number;expires_at:number;consumed_at:number|null};

export class AuthError extends Error{constructor(public status:number,message:string){super(message);}}

function settings(){
 const values=env as unknown as AuthEnv;
 const adminEmail=normalizeEmail(values.RITEVENUE_ADMIN_EMAIL||'');
 const secret=values.RITEVENUE_AUTH_SECRET||'';
 if(!adminEmail||!adminEmail.includes('@')||secret.length<32)throw new AuthError(503,'Administrator sign-in is not configured.');
 return {values,adminEmail,secret};
}

export function authSignInPath(returnTo:string){return `/admin/sign-in?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;}

export async function getAuthenticatedUser(request?:Request):Promise<AuthUser|null>{
 let cookie:string|null;
 if(request)cookie=request.headers.get('cookie');else cookie=(await headers()).get('cookie');
 const token=readCookie(cookie,AUTH_COOKIE);if(!token||token.length<32||token.length>128)return null;
 const id=await sha256(token),now=Math.floor(Date.now()/1000);
 const row=await db().prepare('SELECT user_id,email,role,expires_at FROM auth_sessions WHERE id=? AND expires_at>?').bind(id,now).first<{user_id:string;email:string;role:string;expires_at:number}>();
 if(!row||!['admin','owner'].includes(row.role))return null;
 const email=normalizeEmail(row.email);
 return {userId:row.user_id,email,displayName:email,fullName:null,role:row.role as AuthUser['role']};
}

export async function requireAuthenticatedUser(returnTo:string):Promise<AuthUser>{const user=await getAuthenticatedUser();if(user)return user;redirect(authSignInPath(returnTo));}

export function isAdminUser(user:AuthUser){
 try{const {adminEmail}=settings();return user.role==='admin'&&normalizeEmail(user.email)===adminEmail;}catch{return false;}
}

async function consumeRate(id:string,limit:number,now:number,windowSeconds:number){
 const row=await db().prepare('INSERT INTO auth_rate_limits (id,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING attempts').bind(id,now+windowSeconds,now,now).first<{attempts:number}>();
 if(!row||row.attempts>limit)throw new AuthError(429,'Too many sign-in attempts. Please wait before trying again.');
}

function requestIp(request:Request){return request.headers.get('cf-connecting-ip')||'unknown';}
function localDevelopment(request:Request,deployment:string|undefined){const host=new URL(request.url).hostname;return !deployment?.startsWith('standalone_cloudflare_')&&(host==='localhost'||host==='127.0.0.1'||host==='::1'||host==='[::1]');}

export async function requestAdminOtp(request:Request,emailInput:string){
 const {values,adminEmail,secret}=settings(),email=normalizeEmail(emailInput),database=db(),now=Math.floor(Date.now()/1000);
 const ipHash=await sha256(`${secret}\nip\n${requestIp(request)}`);
 await consumeRate(`otp-ip:${ipHash}`,10,now,15*60);
 const fakeId=crypto.randomUUID();
 if(email!==adminEmail)return {challengeId:fakeId};
 await consumeRate(`otp-email:${await sha256(`${secret}\nemail\n${email}`)}`,5,now,15*60);
 const recent=await database.prepare('SELECT id FROM auth_otp_challenges WHERE email=? AND created_at>? ORDER BY created_at DESC LIMIT 1').bind(email,now-60).first();
 if(recent)throw new AuthError(429,'Please wait one minute before requesting another code.');
 const challengeId=crypto.randomUUID();
 const devOtp=localDevelopment(request,values.RITEVENUE_DEPLOYMENT)&&/^\d{6}$/.test(values.RITEVENUE_AUTH_DEV_OTP||'')?values.RITEVENUE_AUTH_DEV_OTP!:null,code=devOtp||randomOtp();
 const codeHash=await otpHash(secret,challengeId,email,code);
 await database.prepare('INSERT INTO auth_otp_challenges (id,email,code_hash,attempts,expires_at,consumed_at,created_at,request_ip_hash) VALUES (?,?,?,?,?,NULL,?,?)').bind(challengeId,email,codeHash,0,now+OTP_TTL_SECONDS,now,ipHash).run();
 try{
  if(!devOtp){
   const sender=normalizeEmail(values.RITEVENUE_OTP_FROM_EMAIL||'');if(!sender||!values.AUTH_EMAIL)throw new AuthError(503,'Email delivery is not configured.');
   await values.AUTH_EMAIL.send({from:{name:'RiteVenue',email:sender},to:email,subject:'Your RiteVenue administrator sign-in code',text:`Your RiteVenue administrator sign-in code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`});
  }
 }catch(error){await database.prepare('DELETE FROM auth_otp_challenges WHERE id=?').bind(challengeId).run();if(error instanceof AuthError)throw error;throw new AuthError(503,'The sign-in email could not be sent. Please retry.');}
 return {challengeId};
}

export async function verifyAdminOtp(request:Request,challengeId:string,code:string){
 const {adminEmail,secret}=settings(),database=db(),now=Math.floor(Date.now()/1000);
 const challenge=await database.prepare('UPDATE auth_otp_challenges SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL AND expires_at>? AND attempts<? RETURNING id,email,code_hash,attempts,expires_at,consumed_at').bind(challengeId,now,OTP_MAX_ATTEMPTS).first<Challenge>();
 if(!challenge||normalizeEmail(challenge.email)!==adminEmail)throw new AuthError(400,'The code is invalid or expired. Request a new code.');
 if(!/^\d{6}$/.test(code)||!await verifyOtpHash(secret,challenge.id,adminEmail,code,challenge.code_hash))throw new AuthError(400,challenge.attempts>=OTP_MAX_ATTEMPTS?'Too many incorrect codes. Request a new code.':'The code is incorrect.');
 const token=randomToken(),sessionId=await sha256(token),userId=`admin:${await sha256(adminEmail)}`,expiresAt=now+SESSION_TTL_SECONDS;
 await database.batch([
  database.prepare('INSERT INTO auth_sessions (id,user_id,email,role,expires_at,created_at) SELECT ?,?,? ,\'admin\',?,? WHERE EXISTS (SELECT 1 FROM auth_otp_challenges WHERE id=? AND consumed_at IS NULL AND expires_at>?)').bind(sessionId,userId,adminEmail,expiresAt,now,challenge.id,now),
  database.prepare('UPDATE auth_otp_challenges SET consumed_at=? WHERE id=? AND consumed_at IS NULL').bind(now,challenge.id),
  database.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(now),
  database.prepare('DELETE FROM auth_otp_challenges WHERE expires_at<=?').bind(now-86400),
  database.prepare('DELETE FROM auth_rate_limits WHERE expires_at<=?').bind(now)
 ]);
 const saved=await database.prepare('SELECT id FROM auth_sessions WHERE id=?').bind(sessionId).first();if(!saved)throw new AuthError(400,'This code was already used. Request a new code.');
 return {user:{userId,email:adminEmail,displayName:adminEmail,fullName:null,role:'admin' as const},cookie:sessionCookie(token,new URL(request.url).protocol==='https:')};
}

export async function signOut(request:Request){const token=readCookie(request.headers.get('cookie'));if(token)await db().prepare('DELETE FROM auth_sessions WHERE id=?').bind(await sha256(token)).run();return clearSessionCookie(new URL(request.url).protocol==='https:');}
