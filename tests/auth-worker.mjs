// Test the built application in workerd with real local D1 and synthetic Google responses.
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {workerFixtureModules} from './worker-fixture-modules.mjs';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare,Response}=wranglerRequire('miniflare');
const origin='https://ritevenue.test';
const clientId='worker-test.apps.googleusercontent.com';
const pair=await generateKeyPair('RS256'),publicKey=await exportJWK(pair.publicKey);
let authorization,exchangeCalls=0,keyCalls=0,redirectExchange=false,ownerSignIn=false;
const worker=new Miniflare({
 modules:workerFixtureModules(),
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
   const token=await new SignJWT({sub:ownerSignIn?'worker-test-owner':'worker-test-admin',email:ownerSignIn?'owner@example.test':'admin@example.test',email_verified:true,nonce:authorization.searchParams.get('nonce'),iss:'https://accounts.google.com',aud:clientId,iat:now,exp:now+300}).setProtectedHeader({alg:'RS256',kid:'worker-test-key'}).sign(pair.privateKey);
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
 const draftId=crypto.randomUUID(),offerId=crypto.randomUUID();
 const draftResponse=await worker.dispatchFetch(origin+'/api/demo/drafts',{method:'POST',headers:{origin,'content-type':'application/json',cookie:sessionCookie.split(';')[0]},body:JSON.stringify({id:draftId,name:'Flexible fixture venue',city:'Mysore',locality:'Test locality',address:'Private fixture address in Mysore',type:'Resort',capacity:2500,description:'Synthetic venue details for testing the flexible offer workflow locally.',images:[],rightsConfirmed:false,submit:false,rentalDetails:{version:1,spaces:[],offers:[{id:offerId,name:'24-hour rental',spaceIds:[],status:'available',amount:50000000,tax:{status:'included',rate:null},start:'15:00',end:'15:00',endDay:1,food:'unconfirmed',notes:''}],facilities:[],charges:[],menus:[]}})});
 assert.equal(draftResponse.status,200,'Built Worker can save flexible drafts without legacy full-day pricing');
 const savedDraft=JSON.parse((await db.prepare('SELECT data_json FROM owner_drafts WHERE id=?').bind(draftId).first()).data_json);
 assert.equal(savedDraft.city,'Mysore');assert.equal(savedDraft.pricing.rent,0);assert.equal(savedDraft.rentalDetails.offers[0].start,'15:00');
 const draftsResponse=await worker.dispatchFetch(origin+'/api/demo/drafts',{headers:{cookie:sessionCookie.split(';')[0]}});
 assert.equal((await draftsResponse.json()).drafts[0].data.rentalDetails.offers[0].tax.status,'included');
 // Exercise real HTML routing and redirects, not only slug helper functions.
 const imageId=crypto.randomUUID(),secondImageId=crypto.randomUUID();
 const ownerId=(await db.prepare('SELECT owner_id FROM owner_drafts WHERE id=?').bind(draftId).first()).owner_id;
 for(const id of [imageId,secondImageId])await db.prepare('INSERT INTO owner_images (id,owner_id,object_key,content_type,created_at) VALUES (?,?,?,?,?)').bind(id,ownerId,'test/'+id+'.webp','image/webp',new Date().toISOString()).run();
 const published={...savedDraft,images:[imageId,secondImageId],publication:{...savedDraft.publication,source:'admin',consent:true}};
 await db.prepare("UPDATE owner_drafts SET status='approved_public',data_json=? WHERE id=?").bind(JSON.stringify(published),draftId).run();
 const publicCatalog=await (await worker.dispatchFetch(origin+'/api/public/catalog')).json();
 const listing=publicCatalog.venues.find(venue=>venue.slug==='owner-'+draftId);
 assert.match(listing.publicPath,/^\/venues\/flexible-fixture-venue-test-locality-mysore-[a-z0-9]{25}$/);
 const oldPage=await worker.dispatchFetch(origin+'/venues/owner-'+draftId+'?utm_source=instagram',{redirect:'manual'});
 assert.equal(oldPage.status,308,'Old UUID URLs must use a permanent HTTP redirect');
 assert.equal(oldPage.headers.get('location'),listing.publicPath+'?utm_source=instagram');
 const newPage=await worker.dispatchFetch(origin+listing.publicPath+'?utm_source=instagram',{redirect:'manual'});
 assert.equal(newPage.status,200);
 const html=await newPage.text();
 assert.ok(html.includes('https://ritevenue.in'+listing.publicPath),'Canonical metadata must use the clean new URL');
 assert.match(html,/<link[^>]*rel="canonical"[^>]*href="https:\/\/ritevenue.in\/venues\/[^"?]+"/);
 assert.ok(html.includes('Flexible fixture venue'));
 const homeHtml=await (await worker.dispatchFetch(origin+'/')).text();
 assert.ok(homeHtml.includes('href="'+listing.publicPath+'"'),'Directory cards must link directly to the canonical page');
 const standardPublished={...published,rentalDetails:null,publication:{...published.publication,source:'owner'},pricing:{...published.pricing,rent:null,morningRent:null,eveningRent:7000000},packageAvailability:{rent:'price_on_request',marriageRent:'not_applicable',morningRent:'price_on_request',eveningRent:'available'},packageTimings:{...savedDraft.packageTimings,morningRent:{start:'10:00',end:'16:00',nextDay:false},eveningRent:{start:'17:00',end:'23:00',nextDay:false}}};
 await db.prepare('UPDATE owner_drafts SET data_json=? WHERE id=?').bind(JSON.stringify(standardPublished),draftId).run();
 const standardPage=await worker.dispatchFetch(origin+listing.publicPath,{redirect:'manual'});assert.equal(standardPage.status,200);
 const standardHtml=await standardPage.text();assert.match(standardHtml,/Price on request/);assert.match(standardHtml,/10 AM to 4 PM/);assert.match(standardHtml,/5 PM to 11 PM/);assert.match(standardHtml,/70,000/);
 const standardHome=await (await worker.dispatchFetch(origin+'/')).text();assert.match(standardHome,/70,000/);assert.match(standardHome,/Half Day Evening(?:<!-- -->|\s)*rental/);assert.ok(!standardHome.includes('full-day base rent'),'A shorter quoted slot must not be labelled as full-day rent');
 await db.prepare('UPDATE owner_drafts SET data_json=? WHERE id=?').bind(JSON.stringify(published),draftId).run();
 console.log('Passed built Worker standard rentals: quoted shorter-slot card rendering, actual slot timings and mixed quoted/unquoted prices.');
 const updated={...published,name:'Renamed fixture resort'};
 await db.prepare('UPDATE owner_drafts SET data_json=? WHERE id=?').bind(JSON.stringify(updated),draftId).run();
 const newListing=(await (await worker.dispatchFetch(origin+'/api/public/catalog')).json()).venues.find(venue=>venue.slug===listing.slug);
 const renamed=await worker.dispatchFetch(origin+listing.publicPath,{redirect:'manual'});
 assert.equal(renamed.status,308);assert.equal(renamed.headers.get('location'),newListing.publicPath);
 assert.equal((await worker.dispatchFetch(origin+newListing.publicPath,{redirect:'manual'})).status,200);
 const uppercase=await worker.dispatchFetch(origin+newListing.publicPath.toUpperCase().replace('/VENUES/','/venues/'),{redirect:'manual'});
 assert.equal(uppercase.status,308);assert.equal(uppercase.headers.get('location'),newListing.publicPath);
 await db.prepare("UPDATE owner_drafts SET status='draft' WHERE id=?").bind(draftId).run();
 for(const path of [listing.publicPath,newListing.publicPath,'/venues/owner-'+draftId])assert.equal((await worker.dispatchFetch(origin+path,{redirect:'manual'})).status,404,'Withdrawn venues must not resolve through any alias');
 console.log('Passed built Worker readable venue links, permanent legacy/rename/case redirects, clean canonical metadata and withdrawal protection.');
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
 // The same built callback supports owners without weakening administrator authorization.
 redirectExchange=false;ownerSignIn=true;
 const ownerStart=await worker.dispatchFetch(origin+'/api/auth/google-start',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:'audience=owner&return_to=%2Fowner',redirect:'manual'});
 authorization=new URL(ownerStart.headers.get('location'));
 const ownerCallback=await worker.dispatchFetch(origin+'/api/auth/google-callback?'+new URLSearchParams({state:authorization.searchParams.get('state'),code:'synthetic-owner-code'}),{headers:{cookie:ownerStart.headers.get('set-cookie').split(';')[0]},redirect:'manual'});
 assert.equal(ownerCallback.headers.get('location'),'/owner');
 const ownerSession=ownerCallback.headers.getSetCookie().find(c=>c.startsWith('rv_session=')).split(';')[0];
 // dispatchFetch rewrites URL but otherwise uses its local transport Host header.
 const ownerHeaders={origin,host:new URL(origin).host,cookie:ownerSession,'content-type':'application/json'};
 assert.equal((await (await worker.dispatchFetch(origin+'/api/auth/session',{headers:ownerHeaders})).json()).user.role,'owner');
 const ownerIdNew=crypto.randomUUID();
 const portalOpen=await worker.dispatchFetch(origin+'/api/owner',{method:'POST',headers:ownerHeaders,body:JSON.stringify({action:'open',id:ownerIdNew})});assert.equal(portalOpen.status,200,await portalOpen.clone().text());
 const portalRow=await portalOpen.json();assert.equal(portalRow.data.capacity,null);
 const portalSave=await worker.dispatchFetch(origin+'/api/owner',{method:'POST',headers:ownerHeaders,body:JSON.stringify({action:'save',id:ownerIdNew,revision:portalRow.revision,data:{...portalRow.data,name:'Owner incomplete draft'},submit:false})});assert.equal(portalSave.status,200,await portalSave.clone().text());
 const portalList=await worker.dispatchFetch(origin+'/api/owner',{headers:ownerHeaders});assert.equal((await portalList.json()).venues[0].data.name,'Owner incomplete draft');
 assert.equal((await worker.dispatchFetch(origin+'/api/owner')).status,401);
 assert.equal((await worker.dispatchFetch(origin+'/api/wedding-enquiries',{headers:ownerHeaders})).status,403);
 const ownerHtml=await worker.dispatchFetch(origin+'/owner',{headers:ownerHeaders,redirect:'manual'});assert.equal(ownerHtml.status,200,ownerHtml.headers.get('location'));assert.ok((await ownerHtml.text()).includes('Your venues, all in one place.'));
 const ownerEntry=await worker.dispatchFetch(origin+'/list-your-venue',{headers:{host:new URL(origin).host},redirect:'manual'});assert.equal(ownerEntry.status,200);assert.ok((await ownerEntry.text()).includes('Save and continue with Google'));
 const alternateEntry=await worker.dispatchFetch('https://alternate.test/list-your-venue',{headers:{host:'alternate.test'},redirect:'manual'});assert.equal(alternateEntry.status,307);assert.equal(alternateEntry.headers.get('location'),origin+'/list-your-venue');
 console.log('Passed built Worker owner Google sign-in, real D1 workspace creation/autosave, account isolation, HTML entry routes and pre-form canonical redirect.');
 console.log('Passed built Worker Google sign-in, D1 flow consumption, token exchange, remote JWKS verification, session creation, replay rejection and flexible venue draft persistence.');
}finally{await worker.dispose();}
