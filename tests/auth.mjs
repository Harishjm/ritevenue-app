import ts from 'typescript';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {createLocalJWKSet,jwtVerify,generateKeyPair,exportJWK,SignJWT} from 'jose';

const root=resolve('.sites-runtime/auth-tests');mkdirSync(root,{recursive:true});writeFileSync(resolve(root,'package.json'),'{"type":"commonjs"}');
for(const file of ['lib/auth-core.ts','lib/db.ts','lib/auth.ts','lib/google-auth.ts','app/api/auth/[action]/route.ts']){
 let source=readFileSync(file,'utf8').replace("import {env} from 'cloudflare:workers';",'const env=globalThis.__testEnv;').replace("import {headers} from 'next/headers';",'async function headers(){return new Headers(globalThis.__testHeaders||{});}').replace("import {redirect} from 'next/navigation';",'function redirect(path){throw new Error("REDIRECT:"+path);}');
 source=source.replace("import {createRemoteJWKSet,jwtVerify} from 'jose';",'const {createRemoteJWKSet,jwtVerify}=globalThis.__testJose;');
 const dest=resolve(root,file.replace(/\.ts$/,'.js'));mkdirSync(dirname(dest),{recursive:true});
 source=source.replace(/(['"])@\//g,(_,quote)=>quote+(relative(dirname(dest),root)||'.')+'/');
 writeFileSync(dest,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
}

const sql=new DatabaseSync(':memory:');for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
class Statement{constructor(text,args=[]){this.text=text;this.args=args;}bind(...args){return new Statement(this.text,args);}first(){return sql.prepare(this.text).all(...this.args)[0]||null;}all(){return {results:sql.prepare(this.text).all(...this.args)};}run(){const result=sql.prepare(this.text).run(...this.args);return {meta:{changes:Number(result.changes)}};}}
const emails=[];
globalThis.__testEnv={RITEVENUE_ADMIN_EMAIL:'admin@example.test',RITEVENUE_AUTH_SECRET:'test-only-secret-that-is-at-least-32-characters',RITEVENUE_OTP_FROM_EMAIL:'signin@example.test',RITEVENUE_DEPLOYMENT:'standalone_cloudflare_staging',DB:{prepare:text=>new Statement(text),batch:statements=>{sql.exec('BEGIN');try{const results=statements.map(statement=>statement.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}},AUTH_EMAIL:{send:async message=>{emails.push(message);return {messageId:'test'};}}};
const require=createRequire(resolve(root,'entry.js')),auth=require('./lib/auth.js'),core=require('./lib/auth-core.js');
const request=(cookie='')=>new Request('https://ritevenue.test/api/auth/test',{method:'POST',headers:{Origin:'https://ritevenue.test','cf-connecting-ip':'192.0.2.10',...(cookie?{Cookie:cookie}:{})}});

const ignored=await auth.requestAdminOtp(request(),'other@example.test');assert.match(ignored.challengeId,/^[0-9a-f-]{36}$/);assert.equal(emails.length,0);assert.equal(sql.prepare('SELECT count(*) n FROM auth_otp_challenges').get().n,0);
const issued=await auth.requestAdminOtp(request(),'ADMIN@example.test');assert.equal(emails.length,1);assert.equal(emails[0].to,'admin@example.test');
const code=emails[0].text.match(/\b\d{6}\b/)[0],stored=sql.prepare('SELECT code_hash,attempts FROM auth_otp_challenges WHERE id=?').get(issued.challengeId);assert.equal(stored.code_hash.length,64);assert.ok(!stored.code_hash.includes(code));
await assert.rejects(()=>auth.verifyAdminOtp(request(),issued.challengeId,code==='000000'?'000001':'000000'),error=>error.status===400);assert.equal(sql.prepare('SELECT attempts FROM auth_otp_challenges WHERE id=?').get(issued.challengeId).attempts,1);
const verified=await auth.verifyAdminOtp(request(),issued.challengeId,code);assert.equal(verified.user.role,'admin');assert.match(verified.cookie,/HttpOnly/);assert.match(verified.cookie,/Secure/);assert.ok(!verified.cookie.includes(code));
const cookie=verified.cookie.split(';')[0],user=await auth.getAuthenticatedUser(request(cookie));assert.equal(user.email,'admin@example.test');assert.equal(auth.isAdminUser(user),true);
assert.equal(await auth.getAuthenticatedUser(new Request('https://ritevenue.test',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'admin@example.test'}})),null);
await assert.rejects(()=>auth.verifyAdminOtp(request(),issued.challengeId,code),error=>error.status===400);
const cleared=await auth.signOut(request(cookie));assert.match(cleared,/Max-Age=0/);assert.equal(await auth.getAuthenticatedUser(request(cookie)),null);
assert.equal(core.safeReturnPath('https://attacker.test/admin'),'/admin');assert.equal(core.safeReturnPath('//attacker.test'),'/admin');assert.equal(core.safeReturnPath('/admin?tab=pending'),'/admin?tab=pending');
console.log('Passed independent admin auth: allowlisted email, no account disclosure, hashed OTP/session storage, attempt limits, single-use verification, secure cookie, forged-header rejection and logout.');

// Exercise the real OAuth handlers with genuinely signed tokens and local Google keys.
const keyPair=await generateKeyPair('RS256'),jwk=await exportJWK(keyPair.publicKey);
globalThis.__testJose={jwtVerify,createRemoteJWKSet:()=>createLocalJWKSet({keys:[{...jwk,kid:'test-key',alg:'RS256'}]})};
Object.assign(globalThis.__testEnv,{RITEVENUE_GOOGLE_CLIENT_ID:'test-client.apps.googleusercontent.com',RITEVENUE_GOOGLE_CLIENT_SECRET:'test-client-secret',RITEVENUE_GOOGLE_REDIRECT_URI:'https://ritevenue.test/api/auth/google-callback'});
const google=require('./lib/google-auth.js'),route=require('./app/api/auth/[action]/route.js');
const ctx=action=>({params:Promise.resolve({action})});
const startRequest=(body='return_to=%2Fadmin%2Fenquiries',origin='https://ritevenue.test')=>new Request('https://ritevenue.test/api/auth/google-start',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body});
async function start(returnTo='/admin/enquiries'){
 sql.exec('DELETE FROM auth_rate_limits');
 const response=await route.POST(startRequest(new URLSearchParams({return_to:returnTo}).toString()),ctx('google-start'));
 assert.equal(response.status,303);const authorization=new URL(response.headers.get('location'));
 assert.equal(authorization.origin,'https://accounts.google.com');assert.equal(authorization.searchParams.get('scope'),'openid email');
 assert.equal(authorization.searchParams.get('code_challenge_method'),'S256');assert.equal(authorization.searchParams.get('access_type'),'online');
 assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Lax; Max-Age=600; Secure/);
 return {authorization,cookie:response.headers.get('set-cookie').split(';')[0]};
}
const callback=(flow,query={})=>new Request('https://ritevenue.test/api/auth/google-callback?'+new URLSearchParams({code:'test-authorization-code',state:flow.authorization.searchParams.get('state'),...query}),{headers:{cookie:flow.cookie}});
let exchangeCalls=0;
const realFetch=globalThis.fetch;
async function mockToken(flow,claims={},signingKey=keyPair.privateKey){
 const now=Math.floor(Date.now()/1000),payload={sub:'google-admin-id',email:'ADMIN@example.test',email_verified:true,nonce:flow.authorization.searchParams.get('nonce'),iss:'https://accounts.google.com',aud:globalThis.__testEnv.RITEVENUE_GOOGLE_CLIENT_ID,iat:now,exp:now+300,...claims};
 const token=await new SignJWT(payload).setProtectedHeader({alg:'RS256',kid:'test-key'}).sign(signingKey);
 globalThis.fetch=async(url,options)=>{
  exchangeCalls++;assert.equal(url,'https://oauth2.googleapis.com/token');assert.equal(options.redirect,'manual');
  const params=options.body;assert.equal(params.get('client_secret'),'test-client-secret');assert.equal(params.get('redirect_uri'),globalThis.__testEnv.RITEVENUE_GOOGLE_REDIRECT_URI);
  const verifier=params.get('code_verifier'),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  assert.equal(Buffer.from(digest).toString('base64url'),flow.authorization.searchParams.get('code_challenge'));
  return Response.json({id_token:token,access_token:'not-stored',refresh_token:'not-stored'});
 };
}
try{
 assert.equal((await route.POST(startRequest('', 'https://evil.test'),ctx('google-start'))).status,403);
 assert.equal((await route.POST(startRequest('x'.repeat(4100)),ctx('google-start'))).status,413);
 for(const action of ['request-otp','verify-otp'])assert.equal((await route.POST(startRequest(),ctx(action))).status,404);
 const flow=await start();await mockToken(flow);
 const noCookie=new Request(callback(flow).url);
 const beforeCalls=exchangeCalls;assert.equal((await route.GET(noCookie,ctx('google-callback'))).headers.get('location'),'/admin/sign-in?error=google');assert.equal(exchangeCalls,beforeCalls);
 const wrongState=callback(flow,{state:core.randomToken()});await assert.rejects(()=>google.finishGoogleSignIn(wrongState));assert.equal(exchangeCalls,beforeCalls);
 const success=await route.GET(callback(flow),ctx('google-callback'));
 assert.equal(success.headers.get('location'),'/admin/enquiries');assert.equal(success.headers.getSetCookie().length,2);
 const session=success.headers.getSetCookie().find(c=>c.startsWith('rv_session='));assert.match(session,/HttpOnly; SameSite=Lax/);assert.match(session,/Secure/);
 const googleUser=await auth.getAuthenticatedUser(request(session.split(';')[0]));assert.equal(googleUser.email,'admin@example.test');assert.equal(googleUser.userId,verified.user.userId);
 assert.equal(auth.isAdminUser(googleUser),true);assert.equal(sql.prepare('SELECT subject FROM auth_google_identities').get().subject,'google-admin-id');
 await assert.rejects(()=>google.finishGoogleSignIn(callback(flow)));assert.equal(exchangeCalls,beforeCalls+1);
 await auth.signOut(request(session.split(';')[0]));
 const sessionCount=()=>sql.prepare('SELECT count(*) n FROM auth_sessions').get().n;
 const invalidClaims=[{email:'outsider@example.test'},{email_verified:false},{email_verified:'true'},{nonce:'wrong'},{aud:'other-client'},{iss:'https://evil.test'},{exp:1},{iat:Math.floor(Date.now()/1000)+3600},{azp:'other-client'},{sub:'different-google-account'}];
 for(const claims of invalidClaims){const attempt=await start();await mockToken(attempt,claims);const count=sessionCount();const failure=await route.GET(callback(attempt),ctx('google-callback'));assert.equal(failure.headers.get('location'),'/admin/sign-in?error=google');assert.equal(sessionCount(),count);}
 const badSignature=await start();await mockToken(badSignature,{},(await generateKeyPair('RS256')).privateKey);await assert.rejects(()=>google.finishGoogleSignIn(callback(badSignature)));
 const expired=await start();sql.exec('UPDATE auth_google_flows SET expires_at=0');await assert.rejects(()=>google.finishGoogleSignIn(callback(expired)));
 const cancelled=await start();const calls=exchangeCalls;await assert.rejects(()=>google.finishGoogleSignIn(callback(cancelled,{error:'access_denied'})));assert.equal(exchangeCalls,calls);
 const race=await start();await mockToken(race);const raced=await Promise.allSettled([google.finishGoogleSignIn(callback(race)),google.finishGoogleSignIn(callback(race))]);assert.equal(raced.filter(r=>r.status==='fulfilled').length,1);
 const redirectAttack=await start('//evil.test');await mockToken(redirectAttack);assert.equal((await google.finishGoogleSignIn(callback(redirectAttack))).headers.get('location'),'/admin');
 const outage=await start();globalThis.fetch=async()=>new Response(null,{status:500});const count=sessionCount();assert.equal((await route.GET(callback(outage),ctx('google-callback'))).headers.get('location'),'/admin/sign-in?error=google');assert.equal(sessionCount(),count);
 const canonical=await google.startGoogleSignIn(new Request('https://alternate.test/api/auth/google-start',{method:'POST',headers:{origin:'https://alternate.test'}}),'/admin/enquiries');assert.equal(new URL(canonical.headers.get('location')).origin,'https://ritevenue.test');assert.equal(canonical.headers.get('set-cookie'),null);
 sql.exec('DELETE FROM auth_rate_limits');for(let i=0;i<20;i++)await google.startGoogleSignIn(startRequest(),'/admin');await assert.rejects(()=>google.startGoogleSignIn(startRequest(),'/admin'),e=>e.status===429);
 delete globalThis.__testEnv.RITEVENUE_GOOGLE_CLIENT_SECRET;assert.equal((await route.POST(startRequest(),ctx('google-start'))).headers.get('location'),'/admin/sign-in?error=google');
 console.log('Passed Google admin auth: signed-token verification, issuer/audience/nonce/expiry, exact verified-email allowlist, subject binding, PKCE, CSRF, browser state, callback replay/races, rate limits, safe redirects, session/logout, provider errors and disabled OTP endpoints.');
}finally{globalThis.fetch=realFetch;}
