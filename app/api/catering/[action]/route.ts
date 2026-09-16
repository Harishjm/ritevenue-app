import {z} from 'zod';
import {db} from '@/lib/db';
import {isPublicDirectory} from '@/lib/launch';
import {savedWindow,type Quote} from '@/lib/booking';
import {apiUser,apiError,isAdmin,noStore,readBody} from '@/lib/demo-server';
import {cateringCatalog} from '@/lib/catering-server';
import {supplierSchema,estimateSelectionSchema,supplierCompatibility,cateringEstimate} from '@/lib/catering';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:noStore});
export async function GET(request:Request,{params}:{params:Promise<{action:string}>}){try{const user=await apiUser();const {action}=await params;
 if(action==='catalog'&&isPublicDirectory()&&!isAdmin(user))throw new Error('FORBIDDEN');
 if(action==='catalog')return json(await cateringCatalog());
 if(action==='drafts'||action==='admin'){
  if(action==='admin'&&!isAdmin(user))throw new Error('FORBIDDEN');
  const rows=await (action==='admin'?db().prepare('SELECT id,data_json,status,review_note,revision,updated_at FROM catering_drafts ORDER BY updated_at DESC LIMIT 100'):db().prepare('SELECT id,data_json,status,review_note,revision,updated_at FROM catering_drafts WHERE owner_id=? ORDER BY updated_at DESC LIMIT 100').bind(user.userId)).all();
  return json({drafts:rows.results.map(r=>({...r,data:JSON.parse(String(r.data_json)),data_json:undefined}))});
 }
 return json({error:'Not found'},404);
}catch(e){return apiError(e);}}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){try{const user=await apiUser(request);const {action}=await params;if(isPublicDirectory()&&['estimate','attach'].includes(action))return json({error:'Catering estimates and reservations are not part of the public venue directory.'},410);let body:unknown;try{body=await readBody(request);}catch{return json({error:'Invalid or oversized JSON request.'},400);}
 if(action==='estimate'){
  const parsed=estimateSelectionSchema.safeParse(body);if(!parsed.success)return json({error:parsed.error.issues[0].message},400);const s=parsed.data;
  const catalog=await cateringCatalog();const venue=catalog.venues.find(v=>v.slug===s.venueSlug),supplier=catalog.suppliers.find(v=>v.id===s.supplierId),menu=supplier?.menus.find(m=>m.id===s.menuId);
  if(!venue||!supplier||!menu)throw new Error('NOT_FOUND');if(s.guests>venue.capacity)return json({error:'Guest count exceeds the venue capacity.'},400);
  const reason=supplierCompatibility(venue.policy,supplier,venue.area,s.date,s.guests);if(reason)return json({error:reason},409);
  if(s.optional&&(!menu.optionalName||!menu.optionalPerGuest))return json({error:'This menu has no priced optional add-on.'},400);
  return json({estimate:cateringEstimate(supplier,menu,venue.policy,s),notice:'Estimate only. Supplier-listed availability requires confirmation; no catering is reserved or paid.'});
 }
 // Store an optional estimate with the customer's active hold. Venue amounts never change.
 // Confirmation copies this snapshot with the venue quote; it does not reserve a supplier.
 if(action==='attach'){
  const parsed=z.object({holdId:z.string().uuid(),expectedRevision:z.string().uuid().nullable(),selection:estimateSelectionSchema.nullable()}).strict().safeParse(body);
  if(!parsed.success)return json({error:'Invalid catering selection.'},400);
  const {holdId,expectedRevision,selection}=parsed.data;
  const held=await db().prepare("SELECT quote_json FROM demo_slots WHERE hold_id=? AND user_id=? AND status='held' AND expires_at>?").bind(holdId,user.userId,Math.floor(Date.now()/1000)).first<{quote_json:string}>();
  if(!held)return json({error:'This venue hold expired, was confirmed or is unavailable. Return to your booking.'},409);
  const quote:Quote=JSON.parse(held.quote_json);
  if((quote.cateringRevision||null)!==expectedRevision)return json({error:'Your catering selection changed in another tab. Reload checkout before editing it.'},409);
  let estimate:ReturnType<typeof cateringEstimate>|undefined;
  if(selection){
   const window=savedWindow(quote,quote.date);
   if(selection.venueSlug!==quote.venueSlug||selection.guests!==quote.guests||selection.date<window.startsAt.slice(0,10)||selection.date>window.endsAt.slice(0,10))return json({error:'Use the booked venue, guest count and a meal date within your venue access dates.'},400);
   const catalog=await cateringCatalog();
   const venue=catalog.venues.find(v=>v.slug===quote.venueSlug),supplier=catalog.suppliers.find(s=>s.id===selection.supplierId),menu=supplier?.menus.find(m=>m.id===selection.menuId);
   if(!venue||!supplier||!menu)return json({error:'This venue or menu is no longer available for catering discovery.'},409);
   if(selection.guests>venue.capacity)return json({error:'Guest count exceeds the venue capacity.'},400);
   const reason=supplierCompatibility(venue.policy,supplier,venue.area,selection.date,selection.guests);
   if(reason)return json({error:reason},409);
   if(selection.optional&&(!menu.optionalName||!menu.optionalPerGuest))return json({error:'This menu has no priced optional add-on.'},400);
   estimate=cateringEstimate(supplier,menu,venue.policy,selection);
  }
  const next:Quote={...quote,cateringRevision:crypto.randomUUID()};
  if(estimate)next.cateringEstimate=estimate;else delete next.cateringEstimate;
  // Compare the entire previous payload atomically to reject races with other edits,
  // expiry, release or confirmation. No schema or confirmed-booking update is needed.
  const saved=await db().prepare("UPDATE demo_slots SET quote_json=? WHERE hold_id=? AND user_id=? AND status='held' AND expires_at>? AND quote_json=? RETURNING hold_id").bind(JSON.stringify(next),holdId,user.userId,Math.floor(Date.now()/1000),held.quote_json).first();
  if(!saved)return json({error:'Your venue hold or catering selection changed. Reload checkout.'},409);
  return json({saved:true,revision:next.cateringRevision,estimate:estimate||null,notice:'Catering estimate saved with your venue selection. No caterer is reserved or paid.'});
 }
 if(action==='drafts'){
  const parsed=z.object({data:supplierSchema,expectedRevision:z.string().uuid().nullable()}).strict().safeParse(body);if(!parsed.success)return json({error:parsed.error.issues[0].message},400);const {data:d,expectedRevision}=parsed.data;
  const existing=await db().prepare('SELECT owner_id FROM catering_drafts WHERE id=?').bind(d.id).first<{owner_id:string}>();if(existing&&existing.owner_id!==user.userId)throw new Error('FORBIDDEN');
  for(const id of d.images){if(!await db().prepare('SELECT id FROM owner_images WHERE id=? AND owner_id=?').bind(id,user.userId).first())return json({error:'Use only photos uploaded by your account.'},400);}
  if(d.submit&&!d.images.length)return json({error:'Add at least one approved photo before submitting.'},400);
  const revision=crypto.randomUUID(),stamp=new Date().toISOString(),status=d.submit?'pending_review':'draft';
  const result=expectedRevision===null?await db().prepare("INSERT INTO catering_drafts (id,owner_id,data_json,status,review_note,revision,created_at,updated_at) VALUES (?,?,?,?,'',?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id").bind(d.id,user.userId,JSON.stringify(d),status,revision,stamp,stamp).first():await db().prepare("UPDATE catering_drafts SET data_json=?,status=?,review_note='',revision=?,updated_at=? WHERE id=? AND owner_id=? AND revision=? RETURNING id").bind(JSON.stringify(d),status,revision,stamp,d.id,user.userId,expectedRevision).first();
  if(!result)return json({error:'This draft changed in another tab. Refresh the list, reopen the latest draft and try again.'},409);
  return json({id:d.id,status,revision});
 }
 if(action==='review'){
  if(!isAdmin(user))throw new Error('FORBIDDEN');const parsed=z.object({id:z.string().uuid(),status:z.enum(['approved_for_demo','changes_requested']),note:z.string().trim().min(5).max(1000),expectedRevision:z.string().uuid()}).strict().safeParse(body);if(!parsed.success)return json({error:'A review note of 5-1000 characters is required.'},400);const d=parsed.data;
  const result=await db().prepare("UPDATE catering_drafts SET status=?,review_note=?,revision=?,updated_at=? WHERE id=? AND status='pending_review' AND revision=? RETURNING id").bind(d.status,d.note,crypto.randomUUID(),new Date().toISOString(),d.id,d.expectedRevision).first();
  if(!result)return json({error:'This review is stale. Refresh before reviewing again.'},409);return json({reviewed:true});
 }
 return json({error:'Catering reservations and payments are not enabled.'},404);
}catch(e){return apiError(e);}}
