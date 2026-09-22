// Test the built application in workerd with real local D1 and synthetic Google responses.
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare,Response}=wranglerRequire('miniflare');
const origin='https://ritevenue.test';
const clientId='worker-test.apps.googleusercontent.com';
const pair=await generateKeyPair('RS256'),publicKey=await exportJWK(pair.publicKey);
let authorization,exchangeCalls=0,keyCalls=0,redirectExchange=false;
const worker=new Miniflare({
 modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...readdirSync('dist/server',{recursive:true}).filter(file=>file.endsWith('.js')&&file!=='index.js').map(file=>({type:'ESModule',path:resolve('dist/server',file)}))],
 compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],
 d1Databases:{DB:'auth-worker-test'},r2Buckets:['BUCKET'],
 bindings:{RITEVENUE_MODE:'public_directory',RITEVENUE_DEPLOYMENT:'standalone_cloudflare_staging',RITEVENUE_ADMIN_EMAIL:'admin@example.test',RITEVENUE_AUTH_SECRET:'synthetic-worker-test-secret-over-32-characters',RITEVENUE_GOOGLE_CLIENT_ID:clientId,RITEVENUE_GOOGLE_CLIENT_SECRET:'synthetic-google-client-secret',RITEVENUE_GOOGLE_REDIRECT_URI:origin+'/api/auth/google-callback'},
 outboundService:async request=>{
  if(request.url==='https://oauth2.googleapis.com/token'){
   exchangeCalls++;
   if(redirectExchange)return new Response(null,{status:307,headers:{location:'https://unexpected.example.test/token'}});
   const params=new URLSearchParams(await request.text());
   assert.equal(params.get('client_id'),clientId);
   assert.equal(params.get('client_secret'),'synthetic-google-client-secret');
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(params.get('code_verifier')));
   assert.equal(Buffer.from(digest).toString('base64url'),authorization.searchParams.get('code_challenge'));
   const now=Math.floor(Date.now()/1000);
   const token=await new SignJWT({sub:'worker-test-admin',email:'admin@example.test',email_verified:true,nonce:authorization.searchParams.get('nonce'),iss:'https://accounts.google.com',aud:clientId,iat:now,exp:now+300}).setProtectedHeader({alg:'RS256',kid:'worker-test-key'}).sign(pair.privateKey);
   return Response.json({id_token:token});
  }
  if(request.url==='https://www.googleapis.com/oauth2/v3/certs'){
   keyCalls++;return Response.json({keys:[{...publicKey,kid:'worker-test-key',alg:'RS256',use:'sig'}]});
  }
  throw new Error('Unexpected outbound request in local auth test.');
 }
});
try{
 const db=await worker.getD1Database('DB');
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){
  const statements=readFileSync('drizzle/'+file,'utf8').split(';').map(s=>s.replace(/--> statement-breakpoint/g,'').trim()).filter(Boolean);
  for(const statement of statements)await db.prepare(statement).run();
 }
 const start=await worker.dispatchFetch(origin+'/api/auth/google-start',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:'return_to=%2Fadmin%2Fenquiries',redirect:'manual'});
 assert.equal(start.status,303);
 authorization=new URL(start.headers.get('location'),origin);
 assert.equal(authorization.origin,'https://accounts.google.com','Worker must start Google authorization');
 const flowCookie=start.headers.get('set-cookie').split(';')[0];
 const callbackUrl=origin+'/api/auth/google-callback?'+new URLSearchParams({state:authorization.searchParams.get('state'),code:'synthetic-code'});
 const callback=await worker.dispatchFetch(callbackUrl,{headers:{cookie:flowCookie},redirect:'manual'});
 console.log('Local Worker callback:',JSON.stringify({status:callback.status,location:callback.headers.get('location'),exchangeCalls,keyCalls}));
 assert.equal(callback.headers.get('location'),'/admin/enquiries','Valid Google login must create a session in the built Worker');
 const sessionCookie=callback.headers.getSetCookie().find(cookie=>cookie.startsWith('rv_session='));
 assert.ok(sessionCookie);
 const session=await worker.dispatchFetch(origin+'/api/auth/session',{headers:{cookie:sessionCookie.split(';')[0]}});
 assert.deepEqual(await session.json(),{authenticated:true,user:{email:'admin@example.test',role:'admin'}});
 const replay=await worker.dispatchFetch(callbackUrl,{headers:{cookie:flowCookie},redirect:'manual'});
 assert.equal(replay.headers.get('location'),'/admin/sign-in?error=google');
 assert.equal(exchangeCalls,1);
 redirectExchange=true;
 const redirectStart=await worker.dispatchFetch(origin+'/api/auth/google-start',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:'return_to=%2Fadmin',redirect:'manual'});
 const redirectAuth=new URL(redirectStart.headers.get('location'));
 const redirectCallback=await worker.dispatchFetch(origin+'/api/auth/google-callback?'+new URLSearchParams({state:redirectAuth.searchParams.get('state'),code:'synthetic-code'}),{headers:{cookie:redirectStart.headers.get('set-cookie').split(';')[0]},redirect:'manual'});
 assert.equal(redirectCallback.headers.get('location'),'/admin/sign-in?error=google');
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM auth_sessions').first()).n,1);
 assert.equal(exchangeCalls,2);
 console.log('Passed built Worker Google sign-in, D1 flow consumption, token exchange, remote JWKS verification, session creation and replay rejection.');
}finally{await worker.dispose();}
