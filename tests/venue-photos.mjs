import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {jpeg,progressiveJpeg,webp} from './photo-fixtures.mjs';

const root=resolve('.sites-runtime/photo-tests');mkdirSync(root,{recursive:true});writeFileSync(resolve(root,'package.json'),'{"type":"commonjs"}');
for(const name of ['jpeg-photo','venue-photo','optimize-venue-photo'])writeFileSync(resolve(root,name+'.js'),ts.transpileModule(readFileSync('lib/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const require=createRequire(resolve(root,'entry.js'));
const {inspectOptimizedPhoto,normalizeCanvasPhoto,MAX_PHOTO_BYTES}=require('./venue-photo.js');
const {optimizeVenuePhoto}=require('./optimize-venue-photo.js');
for(const bytes of [jpeg,progressiveJpeg]){
 assert.deepEqual(inspectOptimizedPhoto(bytes,'image/jpeg'),{width:32,height:24});
 assert.deepEqual(Buffer.from(normalizeCanvasPhoto(bytes,'image/jpeg')),bytes);
 assert.throws(()=>inspectOptimizedPhoto(bytes));
 assert.throws(()=>inspectOptimizedPhoto(bytes.subarray(0,-2),'image/jpeg'));
 assert.throws(()=>inspectOptimizedPhoto(Buffer.concat([bytes,Buffer.from('trailing')]),'image/jpeg'));
}
const metadata=Buffer.from([0xff,0xe1,0,10,...Buffer.from('ExifGPS!')]);
const withMetadata=Buffer.concat([jpeg.subarray(0,2),metadata,jpeg.subarray(2)]);
assert.throws(()=>inspectOptimizedPhoto(withMetadata,'image/jpeg'));
assert.deepEqual(Buffer.from(normalizeCanvasPhoto(withMetadata,'image/jpeg')),jpeg);
// Metadata after a scan must also be removed, not copied as opaque scan data.
const lateMetadata=Buffer.concat([jpeg.subarray(0,-2),metadata,jpeg.subarray(-2)]);
assert.deepEqual(Buffer.from(normalizeCanvasPhoto(lateMetadata,'image/jpeg')),jpeg);
const tooWide=Buffer.from(jpeg),frame=tooWide.indexOf(Buffer.from([0xff,0xc0]));tooWide.writeUInt16BE(2000,frame+7);
assert.throws(()=>inspectOptimizedPhoto(tooWide,'image/jpeg'));
assert.throws(()=>inspectOptimizedPhoto(Buffer.alloc(MAX_PHOTO_BYTES+1),'image/jpeg'));
assert.throws(()=>inspectOptimizedPhoto(webp,'image/jpeg'));
assert.throws(()=>inspectOptimizedPhoto(Buffer.from('<svg/>'),'image/jpeg'));
const truncatedSegment=Buffer.from(jpeg);truncatedSegment.writeUInt16BE(65535,4);assert.throws(()=>inspectOptimizedPhoto(truncatedSegment,'image/jpeg'));

let closed=0,canvas,calls=[],mode='webp',dimensions={width:3200,height:2400};
globalThis.createImageBitmap=async()=>({...dimensions,close(){closed++;}});
globalThis.document={createElement(){canvas={width:0,height:0,getContext(){return {fillRect(){},drawImage(){}};},toBlob(callback,type,quality){
 calls.push({type,quality,width:this.width,height:this.height});
 if(mode==='none')return callback(null);
 if(type==='image/webp'&&mode!=='webp')return callback(mode==='null'?null:new Blob(['unsupported encoder'],{type:'image/png'}));
 if(mode==='large'&&calls.length<5)return callback(new Blob([new Uint8Array(MAX_PHOTO_BYTES+1)],{type}));
 callback(new Blob([type==='image/webp'?webp:withMetadata],{type}));
 }};return canvas;}};
const source=new File([new Uint8Array(3*1024*1024)],'phone.png',{type:'image/png'});
for(const scenario of ['webp','png','null','large']){
 mode=scenario;calls=[];const result=await optimizeVenuePhoto(source);
 assert.equal(result.blob.type,scenario==='webp'?'image/webp':'image/jpeg');
 assert.ok(result.blob.size<=MAX_PHOTO_BYTES);assert.equal(result.originalBytes,source.size);
 assert.deepEqual(Buffer.from(await result.blob.arrayBuffer()),scenario==='webp'?webp:jpeg);
 assert.equal(calls[0].width,1600);assert.equal(calls[0].height,1200);
 if(scenario!=='webp')assert.equal(calls.filter(call=>call.type==='image/webp').length,1);
 if(scenario==='large')assert.ok(calls.some(call=>call.width===1280),'Reduce dimensions when lower quality alone is insufficient');
 assert.equal(canvas.width,0);assert.equal(canvas.height,0);
}
mode='none';await assert.rejects(()=>optimizeVenuePhoto(source),/Could not prepare/);assert.equal(closed,5);
dimensions={width:10000,height:5000};await assert.rejects(()=>optimizeVenuePhoto(source),/40 megapixels/);assert.equal(closed,6);
await assert.rejects(()=>optimizeVenuePhoto(new File(['a'],'image.heic',{type:'image/heic'})),/HEIC/);
await assert.rejects(()=>optimizeVenuePhoto(new File([new Uint8Array(16*1024*1024)],'large.png',{type:'image/png'})),/15 MB/);
console.log('Passed photo optimization: WebP, PNG/null encoder fallback to JPEG, quality/resize retries, metadata stripping, baseline/progressive JPEG validation, MIME mismatch, limits and memory cleanup.');
