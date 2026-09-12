import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
const root=resolve('.sites-runtime/prototype-tests');mkdirSync(root,{recursive:true});writeFileSync(resolve(root,'package.json'),'{"type":"commonjs"}');
for(const file of ['lib/venues.ts','lib/booking.ts','lib/owner-venue.ts','lib/db.ts','lib/demo-server.ts','lib/calendar.ts','app/api/demo/[action]/route.ts']){
 let source=readFileSync(file,'utf8').replace("import {env} from 'cloudflare:workers';",'const env=globalThis.__testEnv;');
 if(file==='lib/demo-server.ts')source=source.replace("import {getChatGPTUser,type ChatGPTUser} from '@/app/chatgpt-auth';",'type ChatGPTUser=any;async function getChatGPTUser(){return globalThis.__testUser;}');
 const dest=resolve(root,file.replace(/\.ts$/,'.js'));mkdirSync(dirname(dest),{recursive:true});
 source=source.replace(/(['"])@\//g,(_,quote)=>quote+(relative(dirname(dest),root)||'.')+'/');
 writeFileSync(dest,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
}
const sql=new DatabaseSync(':memory:');for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
class Statement{constructor(text,args=[]){this.text=text;this.args=args;}bind(...args){return new Statement(this.text,args);}first(){return sql.prepare(this.text).all(...this.args)[0]||null;}all(){return {results:sql.prepare(this.text).all(...this.args)};}run(){const r=sql.prepare(this.text).run(...this.args);return {meta:{changes:Number(r.changes)}};}}
const objects=new Map();globalThis.__testEnv={RITEVENUE_ADMIN_EMAIL:'admin@example.test',DB:{prepare:text=>new Statement(text),batch:statements=>{sql.exec('BEGIN');try{const results=statements.map(s=>s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}},BUCKET:{put:async(k,b)=>objects.set(k,b),get:async k=>objects.has(k)?{body:objects.get(k)}:null,delete:async k=>objects.delete(k)}};
globalThis.__testUser={userId:'couple-a',email:'couple@example.test',displayName:'Test couple'};
globalThis.fetch=()=>{throw new Error('Unexpected external network call');};
const require=createRequire(resolve(root,'entry.js'));const api=require('./app/api/demo/[action]/route.js');const {venues,indiaToday}=require('./lib/venues.js');const domain=require('./lib/booking.js');
assert.equal(venues.length,20);assert.equal(new Set(venues.map(v=>v.slug)).size,20);assert.ok(venues.every(v=>v.city==='Bengaluru'));assert.equal(new Set(venues.map(v=>v.type)).size,5);
assert.match(indiaToday(),/^\d{4}-\d{2}-\d{2}$/);
const origin='https://ritevenue.test';
async function post(action,body,headers={}){return api.POST(new Request(origin+'/api/demo/'+action,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)}),{params:Promise.resolve({action})});}
async function get(action,query=''){return api.GET(new Request(origin+'/api/demo/'+action+query),{params:Promise.resolve({action})});}
const selection={venueSlug:venues[0].slug,date:indiaToday(),guests:100,packageId:'full-day',addons:['suite']};
assert.equal((await post('hold',{...selection,total:1})).status,400);assert.equal((await post('hold',{...selection,date:'2026-02-30'})).status,400);assert.equal((await post('hold',{...selection,guests:9999})).status,400);assert.equal((await post('hold',selection,{Origin:'https://attacker.test'})).status,403);
const attempts=await Promise.all(Array.from({length:12},()=>post('hold',selection)));assert.equal(attempts.filter(r=>r.status===201).length,1);assert.equal(attempts.filter(r=>r.status===409).length,11);
const hold=await attempts.find(r=>r.status===201).json();assert.equal(hold.quote.advance+hold.quote.balance,hold.quote.total);assert.equal(hold.quote.items.reduce((s,i)=>s+i.amount,0)+hold.quote.tax,hold.quote.total);
const own=await (await get('calendar','?venue='+selection.venueSlug+'&month='+selection.date.slice(0,7))).json();assert.equal(own.days[0].ownHold.id,hold.id);
globalThis.__testUser={userId:'couple-b',email:'other@example.test'};const other=await (await get('calendar','?venue='+selection.venueSlug+'&month='+selection.date.slice(0,7))).json();assert.equal(other.days[0].ownHold,undefined);assert.ok(!JSON.stringify(other).includes('couple-a'));assert.equal((await post('confirm',{holdId:hold.id,acknowledgeDemo:true})).status,409);await post('release',{holdId:hold.id});assert.equal(sql.prepare('SELECT status FROM demo_slots').get().status,'held');assert.equal((await post('pricing',{venueSlug:selection.venueSlug,pricing:domain.defaultPricing(venues[0])})).status,403);
globalThis.__testUser={userId:'admin',email:'admin@example.test'};const updated={...domain.defaultPricing(venues[0]),rent:9999900};assert.equal((await post('pricing',{venueSlug:selection.venueSlug,pricing:updated})).status,200);
globalThis.__testUser={userId:'couple-a',email:'couple@example.test'};const confirmed=await (await post('confirm',{holdId:hold.id,acknowledgeDemo:true})).json();const repeated=await (await post('confirm',{holdId:hold.id,acknowledgeDemo:true})).json();assert.equal(repeated.id,confirmed.id);assert.equal(sql.prepare('SELECT count(*) AS n FROM demo_bookings').get().n,1);assert.equal(sql.prepare('SELECT status FROM demo_slots').get().status,'booked');assert.equal(JSON.parse(sql.prepare('SELECT quote_json FROM demo_bookings').get().quote_json).total,hold.quote.total);assert.equal((await post('hold',selection)).status,409);
const next={...selection,venueSlug:venues[1].slug};const expired=await (await post('hold',next)).json();sql.prepare('UPDATE demo_slots SET expires_at=0 WHERE hold_id=?').run(expired.id);assert.equal((await post('confirm',{holdId:expired.id,acknowledgeDemo:true})).status,409);const reclaimed=await (await post('hold',next)).json();assert.ok(reclaimed.id);await post('release',{holdId:reclaimed.id});assert.equal((await post('hold',next)).status,201);
const id=crypto.randomUUID();const draft={id,name:'Owner test venue',locality:'Jayanagar',address:'Private test address in Bengaluru',type:'Wedding hall',capacity:200,description:'Owner-provided demonstration description with sufficient detail for review.',pricing:updated,images:[],rightsConfirmed:true,submit:false};assert.equal((await post('drafts',draft)).status,200);assert.equal((await post('drafts',{...draft,submit:true})).status,400);
const fake=new Request(origin+'/api/demo/images',{method:'POST',headers:{Origin:origin,'Content-Type':'image/jpeg'},body:'not an image'});assert.equal((await api.POST(fake,{params:Promise.resolve({action:'images'})})).status,400);
// Fixture bytes exercise upload validation/storage; no real image or external call is needed.
const bytes=new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0,0]);const upload=await api.POST(new Request(origin+'/api/demo/images',{method:'POST',headers:{Origin:origin,'Content-Type':'image/jpeg'},body:bytes}),{params:Promise.resolve({action:'images'})});assert.equal(upload.status,201);const image=await upload.json();assert.equal((await post('drafts',{...draft,images:[image.id],submit:true})).status,200);
globalThis.__testUser={userId:'couple-b',email:'other@example.test'};assert.equal((await post('drafts',draft)).status,403);assert.equal((await get('image','?id='+image.id)).status,404);assert.equal((await get('admin')).status,403);assert.equal((await (await get('drafts')).json()).drafts.length,0);
assert.equal((await (await get('catalog')).json()).venues.length,20);
assert.equal((await get('calendar','?venue=owner-'+id+'&month='+indiaToday().slice(0,7))).status,404);
assert.equal((await post('hold',{...selection,venueSlug:'owner-'+id})).status,404);
assert.equal((await post('review',{id,status:'approved_for_demo',note:'Not the admin',expectedUpdatedAt:'stale'})).status,403);
globalThis.__testUser={userId:'admin',email:'admin@example.test'};assert.equal((await get('image','?id='+image.id)).status,200);assert.equal((await post('review',{id,status:'approved_for_demo',note:'Reviewed for private demo only.',expectedUpdatedAt:sql.prepare('SELECT updated_at FROM owner_drafts WHERE id=?').get(id).updated_at})).status,200);assert.equal(sql.prepare('SELECT status FROM owner_drafts WHERE id=?').get(id).status,'approved_for_demo');
// Approval publishes one searchable listing with owner pricing and scoped photos.
const revision=sql.prepare('SELECT updated_at FROM owner_drafts WHERE id=?').get(id).updated_at;
assert.equal((await post('review',{id,status:'approved_for_demo',note:'Repeat review is stale',expectedUpdatedAt:revision})).status,409);
globalThis.__testUser={userId:'couple-b',email:'other@example.test'};
const published=await (await get('catalog')).json();
assert.equal(published.venues.length,21);
const ownerVenue=published.venues.find(v=>v.slug==='owner-'+id);
assert.equal(ownerVenue.name,draft.name);assert.equal(ownerVenue.area,draft.locality);
assert.equal(ownerVenue.source,'owner');assert.equal(ownerVenue.images[0],'/api/demo/image?id='+image.id);
assert.deepEqual(published.pricing[ownerVenue.slug],updated);
assert.ok(!JSON.stringify(published).includes('owner_id'));
assert.equal((await get('image','?id='+image.id)).status,200);
const ownerSelection={...selection,venueSlug:ownerVenue.slug};
const ownerHold=await (await post('hold',ownerSelection)).json();
assert.ok(ownerHold.id);assert.equal(ownerHold.quote.venueSource,'owner');
assert.equal(ownerHold.quote.items[0].amount,updated.rent);
assert.equal((await post('hold',ownerSelection)).status,409);
const visibleCalendar=await (await get('calendar','?venue='+ownerVenue.slug+'&month='+indiaToday().slice(0,7))).json();
assert.equal(visibleCalendar.days[0].status,'held');
// Saving an edit removes the listing and its public-to-signed-in photo access.
const priorPayload=sql.prepare('SELECT data_json FROM owner_drafts WHERE id=?').get(id).data_json;
globalThis.__testUser={userId:'couple-a',email:'couple@example.test'};
const amended={...draft,images:[image.id],name:'Updated owner venue',pricing:{...updated,rent:1234500},submit:true};
assert.equal((await post('drafts',amended)).status,200);
assert.equal((await (await get('catalog')).json()).venues.length,20);
const raced=sql.prepare(domain.ownerHoldSQL).get(ownerVenue.slug,domain.lastBookableDate(),crypto.randomUUID(),'couple-b',Math.floor(Date.now()/1000)+7200,JSON.stringify(ownerHold.quote),id,priorPayload,Math.floor(Date.now()/1000));
assert.equal(raced,undefined);
globalThis.__testUser={userId:'couple-b',email:'other@example.test'};
assert.equal((await get('image','?id='+image.id)).status,404);
assert.equal((await post('hold',{...ownerSelection,date:domain.lastBookableDate()})).status,404);
// The customer's existing hold can complete without changing its saved quote.
const ownerConfirmed=await (await post('confirm',{holdId:ownerHold.id,acknowledgeDemo:true})).json();
assert.ok(ownerConfirmed.id);
assert.equal(JSON.parse(sql.prepare('SELECT quote_json FROM demo_bookings WHERE id=?').get(ownerConfirmed.id).quote_json).total,ownerHold.quote.total);
globalThis.__testUser={userId:'admin',email:'admin@example.test'};
assert.equal((await post('review',{id,status:'approved_for_demo',note:'Stale review must not publish',expectedUpdatedAt:'old-revision'})).status,409);
const freshRevision=sql.prepare('SELECT updated_at FROM owner_drafts WHERE id=?').get(id).updated_at;
assert.equal((await post('review',{id,status:'approved_for_demo',note:'Approved revised listing',expectedUpdatedAt:freshRevision})).status,200);
const republished=await (await get('catalog')).json();
assert.equal(republished.venues.filter(v=>v.slug===ownerVenue.slug).length,1);
assert.equal(republished.venues.find(v=>v.slug===ownerVenue.slug).name,amended.name);
assert.equal(republished.pricing[ownerVenue.slug].rent,1234500);
assert.equal((await (await get('calendar','?venue='+ownerVenue.slug+'&month='+indiaToday().slice(0,7))).json()).days[0].status,'booked');
// Native form checkout is independent of client hydration and uses the same transaction logic.
async function formPost(action,data){return api.POST(new Request(origin+'/api/demo/'+action,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data)}),{params:Promise.resolve({action})});}
globalThis.__testUser={userId:'couple-a',email:'couple@example.test'};
const formStart=await formPost('start-checkout',{venueSlug:venues[4].slug,date:indiaToday(),guests:'120',packageId:'full-day',addons:''});assert.equal(formStart.status,303);const formHold=new URL(formStart.headers.get('location')).pathname.split('/').pop();assert.match(formHold,/^[a-f0-9-]{36}$/);
const formConfirm=await formPost('complete-checkout',{holdId:formHold,acknowledgeDemo:'yes'});assert.equal(formConfirm.status,303);assert.ok(new URL(formConfirm.headers.get('location')).pathname.startsWith('/bookings/'));assert.equal((await formPost('complete-checkout',{holdId:formHold,acknowledgeDemo:'yes'})).headers.get('location'),formConfirm.headers.get('location'));
const invalidForm=await formPost('start-checkout',{venueSlug:venues[4].slug,date:'invalid',guests:'120',packageId:'full-day',addons:''});assert.equal(invalidForm.status,303);assert.ok(invalidForm.headers.get('location').includes('invalid_input'));
globalThis.__testUser=null;assert.equal((await get('calendar','?date='+indiaToday())).status,401);assert.equal((await post('hold',selection)).status,401);
console.log('Passed: 20 venues, pricing integrity, input validation, competing holds, expiry/reclaim, idempotent confirmation, immutable quotes, cross-account isolation, admin restrictions, private uploads, approval-to-catalog, owner venue booking, edit withdrawal, stale review protection and draft moderation. No external calls made.');
