import {z} from 'zod';
import {db} from '@/lib/db';
import {AuthError,consumeRate} from '@/lib/auth';
import {portalUser,workspace} from '@/lib/owner-portal-server';
import {intakeBucket} from '@/lib/intake-photo-server';
import {inspectOptimizedPhoto,MAX_PHOTO_BYTES,photoExtension} from '@/lib/venue-photo';
import {venueImageFilename,venueImageAlt} from '@/lib/venue-image';
import {portalError,portalJson,portalHeaders} from '../route';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const user=await portalUser(request),url=new URL(request.url),id=z.string().uuid().parse(url.searchParams.get('photo'));
 const photo=await db().prepare('SELECT p.venue_id,p.object_key,i.content_type FROM owner_portal_photos p JOIN owner_images i ON i.id=p.id WHERE p.id=? AND p.ready=1').bind(id).first<{venue_id:string;object_key:string;content_type:string}>();
 if(!photo)throw new AuthError(404,'Photo not found.');await workspace(user,photo.venue_id);
 const object=await intakeBucket().get(photo.object_key);if(!object)throw new AuthError(404,'Photo not found.');
 return new Response(object.body,{headers:{...portalHeaders,'Content-Type':photo.content_type,'Content-Security-Policy':"default-src 'none'"}});
}catch(error){return portalError(error);}}
export async function POST(request:Request){try{
 const user=await portalUser(request),url=new URL(request.url),venue=z.string().uuid().parse(url.searchParams.get('venue')),id=z.string().uuid().parse(url.searchParams.get('photo'));
 const row=await workspace(user,venue);if(row.status==='pending_review')throw new AuthError(409,'Withdraw the submission before changing photos.');
 await consumeRate('owner-photo:'+user.userId,100,Math.floor(Date.now()/1000),86400);
 const existing=await db().prepare('SELECT venue_id,ready FROM owner_portal_photos WHERE id=?').bind(id).first<{venue_id:string;ready:number}>();
 if(existing&&existing.venue_id!==venue)throw new AuthError(403,'Photo belongs to another venue.');
 if(existing?.ready===1)return portalJson({id});
 const type=request.headers.get('content-type');
 if(type!=='image/webp'&&type!=='image/jpeg')throw new AuthError(400,'Use the photo picker to optimize this image.');
 const reader=request.body?.getReader();if(!reader)throw new AuthError(400,'Empty upload.');
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_PHOTO_BYTES){await reader.cancel();throw new AuthError(413,'Photo must be at most 350 KB after optimization.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{inspectOptimizedPhoto(bytes,type);}catch(error){throw new AuthError(400,(error as Error).message);}
 const extension=photoExtension(type),data=JSON.parse(row.data_json),filename=venueImageFilename(data.name||'venue',data.locality||'location',data.city||'city',1,extension).replace(`.${extension}`,`-${id}.${extension}`),key=`owner-portal/${venue}/${id}/${crypto.randomUUID()}/${filename}`,stamp=new Date().toISOString();
 await db().prepare('INSERT INTO owner_portal_photos(id,venue_id,uploaded_by,object_key,created_at) SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM owner_portal_photos WHERE venue_id=?)<150 ON CONFLICT(id) DO NOTHING').bind(id,venue,user.userId,key,stamp,venue).run();
 const reserved=await db().prepare('SELECT object_key,venue_id,ready FROM owner_portal_photos WHERE id=?').bind(id).first<{object_key:string;venue_id:string;ready:number}>();
 if(!reserved)throw new AuthError(429,'Photo storage limit reached for this venue. Contact the RiteVenue team.');
 if(reserved.venue_id!==venue)throw new AuthError(403,'Photo belongs to another venue.');
 if(reserved.ready===1)return portalJson({id});
 // Each attempt writes a new object. Only one can finalize the ID; retries never overwrite a live image.
 try{
  await intakeBucket().put(key,bytes,{httpMetadata:{contentType:type}});
  const result=await db().batch([
   db().prepare('UPDATE owner_portal_photos SET ready=1,object_key=? WHERE id=? AND ready=0').bind(key,id),
   db().prepare('INSERT INTO owner_images(id,owner_id,object_key,content_type,created_at) SELECT id,?,object_key,?,? FROM owner_portal_photos WHERE id=? AND object_key=? AND ready=1 ON CONFLICT(id) DO NOTHING').bind(row.created_by,type,stamp,id,key),
   db().prepare('INSERT INTO venue_photo(id,venue_id,stored_filename,alt_text,display_order) SELECT id,venue_id,?,?,(SELECT COALESCE(MAX(display_order),0)+1 FROM venue_photo WHERE venue_id=?) FROM owner_portal_photos WHERE id=? AND object_key=? AND ready=1 ON CONFLICT(id) DO NOTHING').bind(filename,venueImageAlt(data.name||'Venue',data.locality||'',data.city||'',1),venue,id,key)
  ]);
  if(!result[0].meta.changes)await intakeBucket().delete(key);
 }catch(error){
  // An ambiguous DB response may already have committed. Never delete a finalized object.
  const committed=await db().prepare('SELECT id FROM owner_portal_photos WHERE id=? AND object_key=? AND ready=1').bind(id,key).first();
  if(!committed)await intakeBucket().delete(key);throw error;
 }
 return portalJson({id},201);
}catch(error){return portalError(error);}}
