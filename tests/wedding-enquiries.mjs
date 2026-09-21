import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';

const root=resolve('.sites-runtime/wedding-enquiry-tests');mkdirSync(root,{recursive:true});writeFileSync(resolve(root,'package.json'),'{"type":"commonjs"}');
for(const file of ['lib/wedding-enquiries.ts','lib/venue-intake.ts','lib/db.ts','lib/auth-core.ts','lib/auth.ts','lib/demo-server.ts','lib/venues.ts','lib/booking.ts','lib/publication.ts','lib/catering.ts','lib/owner-venue.ts','app/api/wedding-enquiries/route.ts']){
 let source=readFileSync(file,'utf8').replace("import {env} from 'cloudflare:workers';",'const env=globalThis.__weddingEnv;').replace("import {headers} from 'next/headers';",'async function headers(){return new Headers();}').replace("import {redirect} from 'next/navigation';",'function redirect(path){throw new Error("REDIRECT:"+path);}');
 const dest=resolve(root,file.replace(/\.ts$/,'.js'));mkdirSync(dirname(dest),{recursive:true});
 source=source.replace(/(['"])@\//g,(_,quote)=>quote+(relative(dirname(dest),root)||'.')+'/');
 writeFileSync(dest,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
}
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
for(const file of readdirSync('drizzle').filter(file=>file.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
class Statement{
 constructor(text,args=[]){this.text=text;this.args=args;}
 bind(...args){return new Statement(this.text,args);}
 first(){return sql.prepare(this.text).all(...this.args)[0]||null;}
 all(){return {results:sql.prepare(this.text).all(...this.args)};}
 run(){const result=sql.prepare(this.text).run(...this.args);return {meta:{changes:Number(result.changes)}};}
}
globalThis.__weddingEnv={RITEVENUE_ADMIN_EMAIL:'admin@example.test',RITEVENUE_AUTH_SECRET:'wedding-test-only-secret-at-least-32-characters',DB:{prepare:text=>new Statement(text),batch:statements=>{sql.exec('BEGIN');try{const results=statements.map(statement=>statement.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}}};
globalThis.fetch=()=>{throw new Error('Unexpected external call');};
const require=createRequire(resolve(root,'entry.js')),api=require('./app/api/wedding-enquiries/route.js'),{sha256}=require('./lib/auth-core.js'),{planningToday}=require('./lib/wedding-enquiries.js');
const origin='https://ritevenue.test';
const base={requestKey:crypto.randomUUID(),location:'Jayanagar or JP Nagar',datePreference:'flexible',guests:250,food:'both',help:'complete',planner:'yes',budget:'from_10_20',budgetScope:'whole_wedding',name:'Test couple',phone:'+91 98765 43210',email:'COUPLE@example.test',contactMethod:'whatsapp',consent:true,notes:'Please help with a wheelchair-accessible venue.',source:'instagram',medium:'social',campaign:'wedding_launch'};
const submit=(data,extra={})=>api.POST(new Request(origin+'/api/wedding-enquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':'192.0.2.20',...extra},body:JSON.stringify(data)}));
const get=(cookie='',query='')=>api.GET(new Request(origin+'/api/wedding-enquiries'+query,{headers:{Cookie:cookie}}));
const update=(data,cookie='',extra={})=>api.PATCH(new Request(origin+'/api/wedding-enquiries',{method:'PATCH',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...extra},body:JSON.stringify(data)}));
assert.equal((await submit(base,{Origin:'https://other.test'})).status,403);
for(const change of [{consent:false},{guests:0},{guests:50001},{phone:'--------'},{food:'invalid'},{budgetScope:'unspecified'},{datePreference:'exact',eventDate:'2026-02-30'},{datePreference:'exact',eventDate:'2020-01-01'},{datePreference:'month',eventMonth:'2030-13'},{datePreference:'flexible',eventDate:planningToday()},{website:'spam'},{notes:'x'.repeat(40000)},{status:'booked'}])assert.equal((await submit({...base,...change})).status,400,JSON.stringify(change).slice(0,100));
const submitted=await submit(base);assert.equal(submitted.status,201);const receipt=await submitted.json();assert.deepEqual(Object.keys(receipt),['reference']);
assert.equal(submitted.headers.get('Cache-Control'),'private, no-store');
const stored=sql.prepare('SELECT * FROM wedding_enquiries WHERE id=?').get(receipt.reference),storedData=JSON.parse(stored.data_json);
assert.equal(storedData.phone,'+919876543210');assert.equal(storedData.email,'couple@example.test');assert.equal(stored.status,'new');assert.equal(stored.consent_version,'wedding-assistance-v1');assert.equal(storedData.source,'instagram');
assert.equal((await submit(base)).status,200);assert.equal((await submit({...base,guests:300})).status,409);
const races=await Promise.all(Array.from({length:6},()=>submit({...base,requestKey:base.requestKey})));assert.ok(races.every(result=>result.status===200));assert.equal(sql.prepare('SELECT count(*) n FROM wedding_enquiries').get().n,1);
// Parallel first submissions using a new key still produce exactly one enquiry.
const raceKey=crypto.randomUUID();const firstRaces=await Promise.all(Array.from({length:4},()=>submit({...base,requestKey:raceKey},{'cf-connecting-ip':'192.0.2.21'})));const raceReceipts=await Promise.all(firstRaces.map(result=>result.json()));assert.equal(new Set(raceReceipts.map(result=>result.reference)).size,1);
for(let i=0;i<4;i++)assert.equal((await submit({...base,requestKey:crypto.randomUUID(),datePreference:'month',eventMonth:planningToday().slice(0,7),email:''})).status,201);
assert.equal((await submit({...base,requestKey:crypto.randomUUID()})).status,429);
assert.equal((await submit(base)).status,200); // Retries work even after the daily limit.
assert.equal((await get()).status,401);assert.equal((await get('','?id='+receipt.reference)).status,401);
assert.equal((await update({})).status,401);
const token='test-admin-session-token-which-is-32-characters',cookie='rv_session='+token,expires=Math.floor(Date.now()/1000)+3600;
sql.prepare('INSERT INTO auth_sessions(id,user_id,email,role,expires_at,created_at) VALUES (?,?,?,?,?,?)').run(await sha256(token),'admin-id','admin@example.test','admin',expires,expires-3600);
const ownerToken='test-owner-session-token-which-is-32-characters',ownerCookie='rv_session='+ownerToken;
sql.prepare('INSERT INTO auth_sessions(id,user_id,email,role,expires_at,created_at) VALUES (?,?,?,?,?,?)').run(await sha256(ownerToken),'owner-id','owner@example.test','owner',expires,expires-3600);
assert.equal((await get(ownerCookie)).status,403);assert.equal((await update({},ownerCookie)).status,403);
const list=await (await get(cookie)).json();assert.equal(list.enquiries.length,6);assert.equal(list.enquiries.find(row=>row.id===receipt.reference).data.name,'Test couple');
assert.equal((await get(cookie,'?status=bogus')).status,400);assert.equal((await get(cookie,'?page=-1')).status,400);assert.equal((await get(cookie,'?status=constructor')).status,400);
const change={id:receipt.reference,expectedRevision:stored.revision,status:'contacted',coordinator:'RiteVenue team',followUpOn:planningToday(),note:'Discussed location and guest count.'};
assert.equal((await update(change,cookie,{Origin:'https://other.test'})).status,403);
assert.equal((await update({...change,note:''},cookie)).status,400);
assert.equal((await update({...change,followUpOn:'2030-02-30'},cookie)).status,400);
const competing=await Promise.all([update(change,cookie),update({...change,status:'closed'},cookie)]);assert.deepEqual(competing.map(response=>response.status).sort(),[200,409]);
assert.equal(sql.prepare('SELECT count(*) n FROM wedding_enquiry_events WHERE enquiry_id=?').get(receipt.reference).n,1);
const updated=sql.prepare('SELECT * FROM wedding_enquiries WHERE id=?').get(receipt.reference);assert.equal(updated.status,'contacted');assert.notEqual(updated.revision,stored.revision);assert.equal(updated.coordinator,'RiteVenue team');
assert.equal((await (await get(cookie,'?status=contacted')).json()).enquiries.length,1);
const history=await (await get(cookie,'?id='+receipt.reference)).json();assert.equal(history.events[0].note,change.note);assert.equal(sql.prepare('SELECT actor_id FROM wedding_enquiry_events WHERE enquiry_id=?').get(receipt.reference).actor_id,'admin-id');
// A failed status update rolls back its audit event as well.
sql.exec("CREATE TRIGGER reject_test_update BEFORE UPDATE ON wedding_enquiries BEGIN SELECT RAISE(ABORT, 'test failure'); END");
assert.equal((await update({...change,expectedRevision:updated.revision,status:'closed'},cookie)).status,503);assert.equal(sql.prepare('SELECT count(*) n FROM wedding_enquiry_events').get().n,1);sql.exec('DROP TRIGGER reject_test_update');
// Pagination keeps earlier enquiries reachable and does not repeat rows.
for(let i=0;i<25;i++)sql.prepare('INSERT INTO wedding_enquiries(id,request_key,payload_hash,data_json,revision,consent_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),crypto.randomUUID(),'test',stored.data_json,crypto.randomUUID(),'wedding-assistance-v1',stored.created_at,stored.updated_at);
const page1=await (await get(cookie)).json(),page2=await (await get(cookie,'?page=2')).json();assert.equal(page1.enquiries.length,25);assert.equal(page1.hasMore,true);assert.equal(page2.hasMore,false);assert.equal(new Set([...page1.enquiries,...page2.enquiries].map(row=>row.id)).size,31);
assert.equal(sql.prepare('SELECT count(*) n FROM demo_bookings').get().n,0);assert.equal(sql.prepare('SELECT count(*) n FROM demo_slots').get().n,0);
console.log('Passed wedding enquiries: consent/date/contact validation, campaign attribution, private records, real session authorization, CSRF, daily limits, retry/parallel deduplication, paginated inbox, stale edit protection, atomic follow-up history and no booking side effects.');
