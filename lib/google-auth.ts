import {env} from 'cloudflare:workers';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {AuthError,consumeRate,settings} from './auth';
import {db} from './db';
import {otpHash,randomToken,readCookie,safeReturnPath,sessionCookie,sha256,SESSION_TTL_SECONDS} from './auth-core';

const FLOW_COOKIE='rv_google_flow';
const FLOW_TTL=600;
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
type GoogleEnv={RITEVENUE_GOOGLE_CLIENT_ID?:string;RITEVENUE_GOOGLE_CLIENT_SECRET?:string;RITEVENUE_GOOGLE_REDIRECT_URI?:string};
type Flow={nonce:string;return_to:string;audience:'admin'|'owner'};

function configuration(){
 const values=env as unknown as GoogleEnv;
 const {secret,adminEmail,values:authValues}=settings();
 const clientId=values.RITEVENUE_GOOGLE_CLIENT_ID||'',clientSecret=values.RITEVENUE_GOOGLE_CLIENT_SECRET||'';
 let redirectUri:URL;
 try{redirectUri=new URL(values.RITEVENUE_GOOGLE_REDIRECT_URI||'');}catch{throw new AuthError(503,'Google administrator sign-in is not configured.');}
 const local=['localhost','127.0.0.1'].includes(redirectUri.hostname)&&!authValues.RITEVENUE_DEPLOYMENT?.startsWith('standalone_cloudflare_');
 if(!clientId.endsWith('.apps.googleusercontent.com')||!clientSecret||redirectUri.username||redirectUri.password||redirectUri.search||redirectUri.hash||redirectUri.pathname!=='/api/auth/google-callback'||(redirectUri.protocol!=='https:'&&!(local&&redirectUri.protocol==='http:'))){
  throw new AuthError(503,'Google administrator sign-in is not configured.');
 }
 return {clientId,clientSecret,redirectUri,secret,adminEmail};
}

export function googleFlowCookie(value:string,secure:boolean,maxAge=FLOW_TTL){return `${FLOW_COOKIE}=${value}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`;}

function responseRedirect(location:string,cookies:string[]=[]){
 const headers=new Headers({'Location':location,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});
 for(const cookie of cookies)headers.append('Set-Cookie',cookie);
 return new Response(null,{status:303,headers});
}

export function googleFailure(request:Request){
 const page=readCookie(request.headers.get('cookie'),'rv_google_audience')==='owner'?'/owner/sign-in':'/admin/sign-in';
 return responseRedirect(page+'?error=google',[googleFlowCookie('',new URL(request.url).protocol==='https:',0)]);
}

export async function startGoogleSignIn(request:Request,returnTo:string,audience:'admin'|'owner'='admin'){
 const config=configuration(),url=new URL(request.url);
 if(audience==='owner'&&!/^\/owner(?:\?|$)/.test(returnTo))returnTo='/owner';
 if(request.headers.get('origin')!==url.origin)throw new AuthError(403,'This sign-in request is not allowed.');
 // Begin again on the configured canonical host so the callback receives its cookie.
 if(url.origin!==config.redirectUri.origin)return responseRedirect(`${config.redirectUri.origin}/${audience==='owner'?'owner':'admin'}/sign-in?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`);
 const now=Math.floor(Date.now()/1000);
 await consumeRate(`google-ip:${await sha256(`${config.secret}\nip\n${request.headers.get('cf-connecting-ip')||'unknown'}`)}`,20,now,900);
 const state=randomToken(),browserToken=randomToken(),nonce=randomToken();
 const verifier=await otpHash(config.secret,state,browserToken,'google-pkce');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
 const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 await db().batch([
  db().prepare('DELETE FROM auth_google_flows WHERE expires_at<=?').bind(now),
  db().prepare('INSERT INTO auth_google_flows (id,browser_hash,nonce,return_to,expires_at,audience) VALUES (?,?,?,?,?,?)').bind(await sha256(state),await sha256(browserToken),nonce,safeReturnPath(returnTo),now+FLOW_TTL,audience)
 ]);
 const authorization=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 authorization.search=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri.href,response_type:'code',scope:'openid email',state,nonce,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account',access_type:'online'}).toString();
 return responseRedirect(authorization.href,[googleFlowCookie(browserToken,url.protocol==='https:'),`rv_google_audience=${audience}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=600${url.protocol==='https:'?'; Secure':''}`]);
}

export async function finishGoogleSignIn(request:Request){
 const config=configuration(),url=new URL(request.url),now=Math.floor(Date.now()/1000);
 const state=url.searchParams.get('state')||'',browserToken=readCookie(request.headers.get('cookie'),FLOW_COOKIE)||'';
 if(url.origin!==config.redirectUri.origin||!/^[-\w]{43}$/.test(state)||!/^[-\w]{43}$/.test(browserToken))throw new AuthError(400,'Start sign-in again.');
 // Consume atomically before calling Google: callbacks cannot be replayed or raced.
 const flow=await db().prepare('DELETE FROM auth_google_flows WHERE id=? AND browser_hash=? AND expires_at>? RETURNING nonce,return_to,audience').bind(await sha256(state),await sha256(browserToken),now).first<Flow>();
 if(!flow||url.searchParams.has('error'))throw new AuthError(400,'Start sign-in again.');
 const code=url.searchParams.get('code');
 if(!code||code.length>4096)throw new AuthError(400,'Start sign-in again.');
 const response=await fetch('https://oauth2.googleapis.com/token',{
  // workerd supports manual/follow only. Never follow a redirect with OAuth credentials.
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},redirect:'manual',signal:AbortSignal.timeout(10000),
  body:new URLSearchParams({code,client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:config.redirectUri.href,grant_type:'authorization_code',code_verifier:await otpHash(config.secret,state,browserToken,'google-pkce')})
 });
 if(!response.ok)throw new AuthError(503,'Google sign-in could not be completed.');
 const tokens=await response.json() as {id_token?:unknown};
 if(typeof tokens.id_token!=='string'||tokens.id_token.length>20000)throw new AuthError(400,'Google sign-in could not be verified.');
 const {payload}=await jwtVerify(tokens.id_token,googleKeys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:config.clientId,algorithms:['RS256'],requiredClaims:['sub','exp','iat','nonce','email','email_verified'],maxTokenAge:'10 minutes'});
 if(payload.nonce!==flow.nonce||payload.email_verified!==true||typeof payload.email!=='string'||!payload.sub||payload.sub.length>255||(payload.azp!==undefined&&payload.azp!==config.clientId))throw new AuthError(403,'This Google account is not authorized for administration.');
 const email=payload.email.trim().toLowerCase();
 if(flow.audience!=='owner'&&email!==config.adminEmail)throw new AuthError(403,'This Google account is not authorized for administration.');
 const role=email===config.adminEmail?'admin':'owner';
 let userId:string;
 if(role==='admin'){
 // Keep existing admin ownership stable; bind its first Google subject against reassignment.
 await db().prepare('INSERT INTO auth_google_identities (email,subject) VALUES (?,?) ON CONFLICT(email) DO NOTHING').bind(config.adminEmail,payload.sub).run();
 const identity=await db().prepare('SELECT subject FROM auth_google_identities WHERE email=?').bind(config.adminEmail).first<{subject:string}>();
 if(identity?.subject!==payload.sub)throw new AuthError(403,'This Google account is not authorized for administration.');
 userId=`admin:${await sha256(config.adminEmail)}`;
 }else{
  userId=`owner:${await sha256(payload.sub)}`;
  await db().prepare('INSERT INTO owner_accounts (id,google_subject,email,updated_at) VALUES (?,?,?,?) ON CONFLICT(google_subject) DO UPDATE SET email=excluded.email,updated_at=excluded.updated_at').bind(userId,payload.sub,email,new Date().toISOString()).run();
 }
 const token=randomToken(),issuedAt=Math.floor(Date.now()/1000);
 await db().batch([
  db().prepare("INSERT INTO auth_sessions (id,user_id,email,role,expires_at,created_at) VALUES (?,?,?,?,?,?)").bind(await sha256(token),userId,email,role,issuedAt+SESSION_TTL_SECONDS,issuedAt),
  db().prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(issuedAt),
  db().prepare('DELETE FROM auth_rate_limits WHERE expires_at<=?').bind(issuedAt)
 ]);
 return responseRedirect(safeReturnPath(flow.return_to),[sessionCookie(token,url.protocol==='https:'),googleFlowCookie('',url.protocol==='https:',0)]);
}
