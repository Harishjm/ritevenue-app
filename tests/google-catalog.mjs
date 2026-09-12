import ts from 'typescript';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const dir=new URL('../.sites-runtime/google-tests/',import.meta.url);mkdirSync(dir,{recursive:true});writeFileSync(new URL('package.json',dir),'{"type":"commonjs"}');
for(const name of ['google-catalog','google-places']){
 let source=readFileSync(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');
 if(name==='google-places')source=source.replace("import {env} from 'cloudflare:workers';","const env={GOOGLE_MAPS_API_KEY:'test-secret'};");
 writeFileSync(new URL(name+'.js',dir),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
}
const require=createRequire(new URL('entry.js',dir));const catalog=require('./google-catalog.js');const places=require('./google-places.js');
const row={venue_uuid:'b5da2f2b-f1b1-44f4-913b-4cd2737ae2ef',google_place_id:'ChIJ_TEST',locality:'Vijayanagar',category:'wedding_venue',is_claimed_by_owner:false,custom_base_price:null,custom_capacity:null,created_at:'2026-09-11T00:00:00Z'};
assert.equal(catalog.catalogImportSchema.safeParse([row]).success,true);
for(const patch of [{displayName:'Google text'},{photos:[]},{is_claimed_by_owner:true},{custom_base_price:123},{google_place_id:'../../other?key=bad'},{created_at:'wrong'}])assert.equal(catalog.catalogImportSchema.safeParse([{...row,...patch}]).success,false);
assert.equal(catalog.catalogImportSchema.safeParse([row,{...row,google_place_id:'different'}]).success,false);
assert.equal(catalog.uniqueRows([row,row]).length,1);
assert.equal(catalog.safeHttps('javascript:alert(1)'),null);
assert.equal(catalog.safeHttps('https://secret@example.com/'),null);
await assert.rejects(()=>catalog.readLimitedJson(new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(524289)})),/smaller/);
const calls=[];globalThis.fetch=async(url,options)=>{if(options.redirect==='error')throw new TypeError('Invalid redirect value');calls.push({url,options});return Response.json(url.includes('/media?')?{photoUri:'https://lh3.googleusercontent.com/test-image'}:{displayName:{text:'Provider Venue'},formattedAddress:'Provider address',googleMapsUri:'https://maps.google.com/test',photos:[{name:'places/ChIJ_TEST/photos/fresh-reference',googleMapsUri:'https://maps.google.com/photo/test',authorAttributions:[{displayName:'Photographer',uri:'https://maps.google.com/contributor/test'}]}]});};
const resolved=await places.resolveVenue(row,'test-secret');assert.equal(resolved.name,'Provider Venue');assert.equal(resolved.photo.authors[0].name,'Photographer');assert.equal(calls.length,2);
for(const call of calls){assert.equal(call.options.cache,'no-store');assert.equal(call.options.headers['X-Goog-Api-Key'],'test-secret');assert.equal(call.options.redirect,'manual');assert.ok(!call.url.includes('test-secret'));}
assert.ok(!JSON.stringify(resolved).includes('test-secret'));assert.ok(!JSON.stringify(resolved).includes('fresh-reference'));assert.equal(calls[0].options.headers['X-Goog-FieldMask'],'id,displayName,formattedAddress,googleMapsUri,businessStatus,photos,attributions');
globalThis.fetch=async()=>Response.json({displayName:{text:'No photo venue'},photos:[{name:'places/ChIJ_TEST/photos/a'}]});assert.equal((await places.resolveVenue(row,'test-secret')).photo,null);
globalThis.fetch=async()=>new Response('',{status:403});assert.ok((await places.resolveVenue(row,'test-secret')).error);
let redirectCalls=0;globalThis.fetch=async()=>{redirectCalls++;return new Response(null,{status:302,headers:{location:'https://example.com/redirect'}})};assert.ok((await places.resolveVenue(row,'test-secret')).error.includes('UNEXPECTED_REDIRECT'));assert.equal(redirectCalls,1);
const logged=[];const originalError=console.error;console.error=(...args)=>logged.push(args);
try{
 for(const [status,reason,expected] of [[403,'API_KEY_HTTP_REFERRER_BLOCKED','website/referrer'],[403,'SERVICE_DISABLED','disabled'],[403,'BILLING_DISABLED','billing'],[429,'QUOTA_EXCEEDED','quota']]){
  globalThis.fetch=async()=>Response.json({error:{message:'sensitive-test-secret',details:[{'@type':'type.googleapis.com/google.rpc.ErrorInfo',reason,metadata:{key:'test-secret'}}]}},{status});
  const failed=await places.resolveVenue(row,'test-secret');assert.ok(failed.error.includes(expected));assert.ok(failed.error.includes(reason));assert.ok(!JSON.stringify(failed).includes('test-secret'));
 }
 globalThis.fetch=async()=>Response.json({error:{details:[{reason:'test-secret'}]}},{status:403});assert.ok((await places.resolveVenue(row,'test-secret')).error.includes('HTTP_403'));
 globalThis.fetch=async()=>{throw new DOMException('test-secret','TimeoutError')};assert.ok((await places.resolveVenue(row,'test-secret')).error.includes('TIMEOUT'));
 globalThis.fetch=async()=>{throw new Error('test-secret')};assert.ok((await places.resolveVenue(row,'test-secret')).error.includes('CONNECTION_FAILED'));
 globalThis.fetch=async()=>{throw new TypeError('Unsupported cache mode: no-store')};assert.ok((await places.resolveVenue(row,'test-secret')).error.includes('RUNTIME_CACHE_OPTION'));
 globalThis.fetch=async()=>{throw new TypeError('Illegal invocation')};assert.ok((await places.resolveVenue(row,'test-secret')).error.includes('RUNTIME_FETCH_BINDING'));
 globalThis.fetch=async()=>{throw new Error('Failure https://example.com/?key=test-secret AIzaFakeSecret123')};await places.resolveVenue(row,'test-secret');
 assert.ok(!JSON.stringify(logged).includes('test-secret'));
 assert.ok(!JSON.stringify(logged).includes('AIzaFakeSecret123'));assert.ok(!JSON.stringify(logged).includes('https://example.com'));
}finally{console.error=originalError;}
console.log('Passed catalog validation, safe URL, size limit, ID deduplication, provider request, attribution, no-secret-output and provider failure checks.');
