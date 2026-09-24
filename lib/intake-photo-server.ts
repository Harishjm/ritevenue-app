import {env} from 'cloudflare:workers';
import {db} from './db';
import {intakeSchema,intakeHeaders,digest} from './venue-intake';
import {inspectOptimizedPhoto,MAX_PHOTO_REQUEST_BYTES,MAX_VENUE_PHOTOS} from './venue-photo';
import {venueImageFilename} from './venue-image';

type Photo={id:string;intake_id:string;position:number;object_key:string;description:string;width:number;height:number;bytes:number;sha256:string};
type Intake={id:string;payload_hash:string;status:string};
const json=(body:unknown,status:number)=>Response.json(body,{status,headers:intakeHeaders});
export function intakeBucket(){const binding=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(!binding)throw new Error('Photo storage is unavailable.');return binding;}
export async function intakePhotoRows(id:string){return (await db().prepare('SELECT * FROM intake_photos WHERE intake_id=? ORDER BY position').bind(id).all<Photo>()).results;}
export async function inboxPhotoRows(){return (await db().prepare("SELECT * FROM intake_photos WHERE intake_id IN (SELECT id FROM public_venue_intakes WHERE status!='uploading' ORDER BY created_at DESC LIMIT 100) ORDER BY position").all<Photo>()).results;}
export const photoSummary=(photo:Photo)=>({id:photo.id,description:photo.description,width:photo.width,height:photo.height,bytes:photo.bytes,url:'/api/venue-applications?photo='+photo.id});

async function boundedForm(request:Request){
 const reader=request.body?.getReader();if(!reader)throw new Error('Empty application.');
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_PHOTO_REQUEST_BYTES){await reader.cancel();throw new Error('The photo upload is too large. Select up to six optimized photos.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
}

export async function submitPhotoIntake(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Please submit from the RiteVenue website.'},403);
 const database=db(),now=Math.floor(Date.now()/1000);
 try{
  // Limit expensive multipart parsing and storage retries as well as new applications.
  const network=await digest('venue-intake:'+Math.floor(now/86400)+':'+(request.headers.get('cf-connecting-ip')||'unknown'));
  const attempt=await database.prepare('INSERT INTO public_intake_limits (id,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind('photos:'+network,now+86400).first<{attempts:number}>();
  if(!attempt||attempt.attempts>30)return json({error:'Photo submission limit reached. Please try again tomorrow.'},429);
  let form:FormData;try{form=await boundedForm(request);}catch{return json({error:'Could not read the upload. Select up to six optimized photos and retry.'},400);}
  if([...form.keys()].some(key=>!['application','photos'].includes(key))||form.getAll('application').length!==1)return json({error:'Invalid application upload.'},400);
  const raw=form.get('application');if(typeof raw!=='string'||raw.length>16000)return json({error:'Invalid application details.'},400);
  let body:unknown;try{body=JSON.parse(raw);}catch{return json({error:'Invalid application details.'},400);}
  const parsed=intakeSchema.safeParse(body);if(!parsed.success)return json({error:parsed.error.issues[0].message},400);
  const {requestKey,website,...data}=parsed.data,files=form.getAll('photos');
  if(website||!data.photoConsent||!files.length||files.length>MAX_VENUE_PHOTOS||data.photoDescriptions.length!==files.length)return json({error:'Add one to six photos, describe each one and confirm your permission to supply them.'},400);
  const photos=[];
  try{for(const file of files){if(typeof file==='string'||file.type!=='image/webp')throw new Error('Invalid image type.');const bytes=new Uint8Array(await file.arrayBuffer());const dimensions=inspectOptimizedPhoto(bytes);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');photos.push({bytes,hash,...dimensions});}}catch{return json({error:'A photo is invalid or not optimized. Remove it and select the original photo again.'},400);}
  const payload=JSON.stringify(data),hash=await digest(JSON.stringify({data,photos:photos.map(photo=>photo.hash)}));
  let saved=await database.prepare('SELECT id,payload_hash,status FROM public_venue_intakes WHERE request_key=?').bind(requestKey).first<Intake>();
  if(saved&&saved.payload_hash!==hash)return json({error:'This application changed. Please submit it again with a new reference.'},409);
  if(saved&&saved.status!=='uploading')return json({reference:saved.id},200);
  const storage=intakeBucket();
  if(!saved){
   const id=crypto.randomUUID(),stamp=new Date().toISOString();
   const statements=[
    database.prepare('DELETE FROM public_intake_limits WHERE expires_at<?').bind(now),
    database.prepare('INSERT INTO public_intake_limits (id,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1').bind(network,now+86400),
    database.prepare("INSERT INTO public_venue_intakes (id,request_key,payload_hash,data_json,status,created_at) SELECT ?,?,?,?,'uploading',? WHERE (SELECT attempts FROM public_intake_limits WHERE id=?)<=5 ON CONFLICT(request_key) DO NOTHING").bind(id,requestKey,hash,payload,stamp,network)
   ];
    photos.forEach((photo,position)=>{const photoId=crypto.randomUUID();statements.push(database.prepare('INSERT INTO intake_photos (id,intake_id,position,object_key,description,width,height,bytes,sha256) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM public_venue_intakes WHERE id=?)').bind(photoId,id,position,`intake-images/${id}/${venueImageFilename(data.venueName,data.locality,'Bengaluru',position+1)}`,data.photoDescriptions[position],photo.width,photo.height,photo.bytes.length,photo.hash,id));});
   // Metadata is reserved atomically. Incomplete uploads remain private and retryable.
   await database.batch(statements);
   saved=await database.prepare('SELECT id,payload_hash,status FROM public_venue_intakes WHERE request_key=?').bind(requestKey).first<Intake>();
   if(!saved)return json({error:'Submission limit reached. Please try again tomorrow.'},429);
   if(saved.payload_hash!==hash)return json({error:'This application changed. Please submit it again with a new reference.'},409);
   if(saved.status!=='uploading')return json({reference:saved.id},200);
  }
  const storedPhotos=await intakePhotoRows(saved.id);
  if(storedPhotos.length!==photos.length)throw new Error('Incomplete photo reservation.');
  // Identical retries write identical bytes to the same reserved keys; no orphan uploads.
  for(const photo of storedPhotos){const incoming=photos[photo.position];if(photo.sha256!==incoming.hash)throw new Error('Photo conflict.');await storage.put(photo.object_key,incoming.bytes,{httpMetadata:{contentType:'image/webp'}});}
  await database.prepare("UPDATE public_venue_intakes SET status='new' WHERE id=? AND status='uploading'").bind(saved.id).run();
  return json({reference:saved.id},201);
 }catch{return json({error:'We could not finish saving your photos. Keep this page open and retry with the same photos.'},503);}
}
