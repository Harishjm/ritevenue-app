import {db} from '@/lib/db';
import {readBody,apiUser,isAdmin,apiError} from '@/lib/demo-server';
import {intakeSchema,intakeHeaders,digest} from '@/lib/venue-intake';
import {submitPhotoIntake,intakeBucket,inboxPhotoRows,photoSummary} from '@/lib/intake-photo-server';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:intakeHeaders});
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Please submit from the RiteVenue website.'},403);
 if(request.headers.get('content-type')?.startsWith('multipart/form-data'))return submitPhotoIntake(request);
 let body;try{body=await readBody(request);}catch{return json({error:'Please check the form and try again.'},400);}
 const parsed=intakeSchema.safeParse(body);if(!parsed.success)return json({error:parsed.error.issues[0].message},400);
 const {requestKey,website,...data}=parsed.data;
 if(data.photoDescriptions.length||data.photoConsent)return json({error:'Please attach your photos using the upload form.'},400);
 if(website)return json({error:'Unable to accept this submission.'},400);
 try{
  const database=db(),payload=JSON.stringify({...data,photoDescriptions:undefined,photoConsent:undefined}),hash=await digest(payload),now=Math.floor(Date.now()/1000);
  const previous=await database.prepare('SELECT id,payload_hash FROM public_venue_intakes WHERE request_key=?').bind(requestKey).first<{id:string;payload_hash:string}>();
  if(previous)return previous.payload_hash===hash?json({reference:previous.id},200):json({error:'Please refresh before sending a different application.'},409);
  // Count attempts durably and atomically with insertion. Unknown IPs share a conservative limit.
  // The edge supplies CF-Connecting-IP; never trust X-Forwarded-For from a client.
  const bucket=await digest('venue-intake:'+Math.floor(now/86400)+':'+(request.headers.get('cf-connecting-ip')||'unknown'));
  const id=crypto.randomUUID();
  await database.batch([
   database.prepare('DELETE FROM public_intake_limits WHERE expires_at<?').bind(now),
   database.prepare('INSERT INTO public_intake_limits (id,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1').bind(bucket,now+86400),
   database.prepare("INSERT INTO public_venue_intakes (id,request_key,payload_hash,data_json,status,created_at) SELECT ?,?,?,?,'new',? WHERE (SELECT attempts FROM public_intake_limits WHERE id=?)<=5 ON CONFLICT(request_key) DO NOTHING").bind(id,requestKey,hash,payload,new Date().toISOString(),bucket)
  ]);
  const saved=await database.prepare('SELECT id,payload_hash FROM public_venue_intakes WHERE request_key=?').bind(requestKey).first<{id:string;payload_hash:string}>();
  if(!saved)return json({error:'Submission limit reached. Please try again tomorrow.'},429);
  if(saved.payload_hash!==hash)return json({error:'Please refresh before sending a different application.'},409);
  return json({reference:saved.id},201);
 }catch{return json({error:'We could not save your application. Your entries are still here; please retry.'},503);}
}
// Contact details are never available through an anonymous read endpoint.
export async function GET(request?:Request){try{
 const user=await apiUser();if(!isAdmin(user))throw new Error('FORBIDDEN');
 const photoId=request?new URL(request.url).searchParams.get('photo'):null;
 if(photoId){
  const photo=await db().prepare("SELECT p.object_key FROM intake_photos p JOIN public_venue_intakes i ON i.id=p.intake_id WHERE p.id=? AND i.status!='uploading'").bind(photoId).first<{object_key:string}>();
  if(!photo)throw new Error('NOT_FOUND');const object=await intakeBucket().get(photo.object_key);if(!object)throw new Error('NOT_FOUND');
  return new Response(object.body,{headers:{...intakeHeaders,'Content-Type':'image/webp','Content-Security-Policy':"default-src 'none'",'X-Robots-Tag':'noindex, nofollow'}});
 }
 const rows=await db().prepare("SELECT id,data_json,status,converted_draft_id,review_note,reviewed_at,created_at FROM public_venue_intakes WHERE status!='uploading' ORDER BY created_at DESC LIMIT 100").all<{id:string;data_json:string;status:string;converted_draft_id:string|null;review_note:string;reviewed_at:string|null;created_at:string}>();
 const photos=await inboxPhotoRows();
 return json({applications:rows.results.map(r=>({id:r.id,data:JSON.parse(r.data_json),status:r.status,convertedDraftId:r.converted_draft_id,reviewNote:r.review_note,reviewedAt:r.reviewed_at,createdAt:r.created_at,photos:photos.filter(photo=>photo.intake_id===r.id).map(photoSummary)}))});
}catch(e){return apiError(e);}}
