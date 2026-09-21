import {db} from '@/lib/db';
import {readBody,apiUser,isAdmin} from '@/lib/demo-server';
import {digest} from '@/lib/venue-intake';
import {ENQUIRY_CONSENT_VERSION,weddingEnquirySchema,enquiryUpdateSchema,enquiryStatuses,type WeddingEnquiryData,type EnquiryStatus} from '@/lib/wedding-enquiries';

export const dynamic='force-dynamic';
const responseHeaders={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:responseHeaders});
function failure(error:unknown){const reason=error instanceof Error?error.message:'';return reason==='AUTH'?json({error:'Please sign in to the administrator workspace.'},401):reason==='FORBIDDEN'||reason==='ORIGIN'?json({error:'This action is not allowed.'},403):json({error:'Enquiries are temporarily unavailable. Please retry.'},503);}

// Visitors may submit an enquiry, but cannot retrieve private contact information.
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Please submit from the RiteVenue website.'},403);
 let body:unknown;try{body=await readBody(request);}catch{return json({error:'Check the form and try again.'},400);}
 const parsed=weddingEnquirySchema.safeParse(body);
 if(!parsed.success)return json({error:parsed.error.issues[0].message,field:parsed.error.issues[0].path[0]},400);
 const {requestKey,website,...data}=parsed.data;
 if(website)return json({error:'Unable to accept this enquiry.'},400);
 try{
  const database=db(),payload=JSON.stringify(data),hash=await digest(payload),now=Math.floor(Date.now()/1000);
  const previous=await database.prepare('SELECT id,payload_hash FROM wedding_enquiries WHERE request_key=?').bind(requestKey).first<{id:string;payload_hash:string}>();
  if(previous)return previous.payload_hash===hash?json({reference:previous.id},200):json({error:'The previous attempt used different details. Please submit again with a new reference.'},409);
  const network=await digest(`wedding-enquiry:${Math.floor(now/86400)}:${request.headers.get('cf-connecting-ip')||'unknown'}`),id=crypto.randomUUID(),stamp=new Date().toISOString();
  await database.batch([
   database.prepare('DELETE FROM wedding_enquiry_limits WHERE expires_at<=?').bind(now),
   database.prepare('INSERT INTO wedding_enquiry_limits (id,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1').bind(network,now+86400),
   database.prepare("INSERT INTO wedding_enquiries (id,request_key,payload_hash,data_json,status,coordinator,follow_up_on,revision,consent_version,created_at,updated_at) SELECT ?,?,?,?,'new','','',?,?,?,? WHERE (SELECT attempts FROM wedding_enquiry_limits WHERE id=?)<=5 ON CONFLICT(request_key) DO NOTHING").bind(id,requestKey,hash,payload,crypto.randomUUID(),ENQUIRY_CONSENT_VERSION,stamp,stamp,network)
  ]);
  const saved=await database.prepare('SELECT id,payload_hash FROM wedding_enquiries WHERE request_key=?').bind(requestKey).first<{id:string;payload_hash:string}>();
  if(!saved)return json({error:'You have reached the enquiry limit. Please try again tomorrow.'},429);
  if(saved.payload_hash!==hash)return json({error:'The previous attempt used different details. Please submit again with a new reference.'},409);
  return json({reference:saved.id},saved.id===id?201:200);
 }catch{return json({error:'We could not save your enquiry. Your entries are still here; please retry.'},503);}
}

type StoredEnquiry={id:string;data_json:string;status:EnquiryStatus;coordinator:string;follow_up_on:string;revision:string;consent_version:string;created_at:string;updated_at:string};
export async function GET(request:Request){
 try{
  const user=await apiUser(request);if(!isAdmin(user))throw new Error('FORBIDDEN');
  const url=new URL(request.url),status=url.searchParams.get('status')||'',page=Number(url.searchParams.get('page')||'1'),id=url.searchParams.get('id');
  if(id){
   if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:'Invalid enquiry reference.'},400);
   const exists=await db().prepare('SELECT id FROM wedding_enquiries WHERE id=?').bind(id).first();if(!exists)return json({error:'Enquiry not found.'},404);
   const events=await db().prepare('SELECT id,status,note,coordinator,follow_up_on,created_at FROM wedding_enquiry_events WHERE enquiry_id=? ORDER BY created_at DESC,id DESC LIMIT 100').bind(id).all();
   return json({events:events.results});
  }
  if((status&&!Object.hasOwn(enquiryStatuses,status))||!Number.isSafeInteger(page)||page<1||page>100000)return json({error:'Invalid enquiry filter.'},400);
  const where=status?'WHERE status=?':'',args=status?[status]:[],size=25;
  const rows=await db().prepare(`SELECT * FROM wedding_enquiries ${where} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`).bind(...args,size+1,(page-1)*size).all<StoredEnquiry>();
  return json({enquiries:rows.results.slice(0,size).map(row=>({id:row.id,data:JSON.parse(row.data_json) as WeddingEnquiryData,status:row.status,coordinator:row.coordinator,followUpOn:row.follow_up_on,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,consentVersion:row.consent_version})),hasMore:rows.results.length>size,page});
 }catch(error){return failure(error);}
}

export async function PATCH(request:Request){
 try{
  const user=await apiUser(request);if(!isAdmin(user))throw new Error('FORBIDDEN');
  let body:unknown;try{body=await readBody(request);}catch{return json({error:'Check the update and try again.'},400);}
  const parsed=enquiryUpdateSchema.safeParse(body);if(!parsed.success)return json({error:parsed.error.issues[0].message},400);
  const data=parsed.data,database=db(),eventId=crypto.randomUUID(),revision=crypto.randomUUID(),stamp=new Date().toISOString();
  await database.batch([
   database.prepare('INSERT INTO wedding_enquiry_events (id,enquiry_id,actor_id,status,note,coordinator,follow_up_on,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM wedding_enquiries WHERE id=? AND revision=?)').bind(eventId,data.id,user.userId,data.status,data.note,data.coordinator,data.followUpOn,stamp,data.id,data.expectedRevision),
   database.prepare('UPDATE wedding_enquiries SET status=?,coordinator=?,follow_up_on=?,revision=?,updated_at=? WHERE id=? AND revision=? AND EXISTS (SELECT 1 FROM wedding_enquiry_events WHERE id=?)').bind(data.status,data.coordinator,data.followUpOn,revision,stamp,data.id,data.expectedRevision,eventId)
  ]);
  const event=await database.prepare('SELECT id FROM wedding_enquiry_events WHERE id=?').bind(eventId).first();
  if(!event)return json({error:'This enquiry changed. Refresh the inbox before saving your update.'},409);
  return json({saved:true,revision});
 }catch(error){return failure(error);}
}
