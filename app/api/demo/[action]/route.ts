import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db} from '@/lib/db';
import {calendarSnapshot} from '@/lib/calendar';
import {apiUser,apiError,isAdmin,noStore,readBody,catalogPricing,venuePricing} from '@/lib/demo-server';
import {venues,venueTypes,indiaToday} from '@/lib/venues';
import {dateSchema,selectionSchema,makeQuote,HOLD_SECONDS,holdSQL,confirmInsertSQL,confirmSlotSQL,pricingSchema,validDate} from '@/lib/booking';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:noStore});
const draftSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(3).max(100),locality:z.string().trim().min(2).max(100),address:z.string().trim().min(8).max(400),type:z.string().refine(v=>venueTypes.slice(1).includes(v)),capacity:z.number().int().min(1).max(2000),description:z.string().trim().min(40).max(3000),pricing:pricingSchema,images:z.array(z.string().uuid()).max(6),rightsConfirmed:z.literal(true),submit:z.boolean()}).strict();
function bucket(){const b=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(!b)throw new Error('Storage unavailable');return b;}
export async function GET(request:Request,{params}:{params:Promise<{action:string}>}){
 try{const user=await apiUser();const {action}=await params;const url=new URL(request.url);const database=db();const now=Math.floor(Date.now()/1000);
  if(action==='session')return json({admin:isAdmin(user),name:user.displayName});
  if(action==='catalog')return json({pricing:await catalogPricing()});
  if(action==='calendar'){
   const slug=url.searchParams.get('venue');const month=url.searchParams.get('month');const date=url.searchParams.get('date');
   if(date){if(!dateSchema.safeParse(date).success)return json({error:'Choose a date in the next 12 months.'},400);const rows=await database.prepare("SELECT venue_slug FROM demo_slots WHERE event_date=? AND (status='booked' OR (status='held' AND expires_at>?))").bind(date,now).all();return json({unavailable:rows.results.map(r=>r.venue_slug),serverTime:now});}
   if(!venues.some(v=>v.slug===slug)||!month||!/^\d{4}-\d{2}$/.test(month)||!validDate(month+'-01'))return json({error:'Invalid calendar request'},400);
   return json(await calendarSnapshot(slug!,month,user.userId));
  }
  if(action==='bookings'){const rows=await database.prepare('SELECT id,venue_slug,event_date,quote_json,created_at FROM demo_bookings WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user.userId).all();return json({bookings:rows.results.map(r=>({...r,quote:JSON.parse(String(r.quote_json)),quote_json:undefined}))});}
  if(action==='drafts'||action==='admin'){
   if(action==='admin'&&!isAdmin(user))throw new Error('FORBIDDEN');
   const rows=await (action==='admin'?database.prepare('SELECT id,data_json,status,review_note,updated_at FROM owner_drafts ORDER BY updated_at DESC LIMIT 100'):database.prepare('SELECT id,data_json,status,review_note,updated_at FROM owner_drafts WHERE owner_id=? ORDER BY updated_at DESC LIMIT 100').bind(user.userId)).all();
   const bookings=isAdmin(user)?await database.prepare('SELECT id,venue_slug,event_date,quote_json,created_at FROM demo_bookings ORDER BY created_at DESC LIMIT 100').all():null;
   return json({drafts:rows.results.map(r=>({...r,data:JSON.parse(String(r.data_json)),data_json:undefined})),bookings:bookings?.results.map(r=>({...r,quote:JSON.parse(String(r.quote_json)),quote_json:undefined})),pricing:isAdmin(user)?await catalogPricing():undefined});
  }
  if(action==='image'){
   const id=url.searchParams.get('id');if(!id||!z.string().uuid().safeParse(id).success)throw new Error('NOT_FOUND');const record=await database.prepare('SELECT owner_id,object_key,content_type FROM owner_images WHERE id=?').bind(id).first<{owner_id:string;object_key:string;content_type:string}>();if(!record||(record.owner_id!==user.userId&&!isAdmin(user)))throw new Error('NOT_FOUND');const image=await bucket().get(record.object_key);if(!image)throw new Error('NOT_FOUND');return new Response(image.body,{headers:{...noStore,'Content-Type':record.content_type,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});
  }
  return json({error:'Not found'},404);
 }catch(error){return apiError(error);}
}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 try{const user=await apiUser(request);const {action:requestedAction}=await params;const formFlow=['start-checkout','complete-checkout','cancel-checkout'].includes(requestedAction);const action=({'start-checkout':'hold','complete-checkout':'confirm','cancel-checkout':'release'} as Record<string,string>)[requestedAction]||requestedAction;const database=db();const now=Math.floor(Date.now()/1000);
  const reply=(data:any,status=200)=>{if(!formFlow)return json(data,status);const path=status>=400?'/checkout/problem?code='+(status===409?'not_available':status===400?'invalid_input':'service_unavailable'):action==='hold'?'/checkout/'+data.id:action==='confirm'?'/bookings/'+data.id:'/bookings';return Response.redirect(new URL(path,request.url),303);};
  if(action==='images'){
   const count=await database.prepare('SELECT count(*) AS n FROM owner_images WHERE owner_id=?').bind(user.userId).first<{n:number}>();if((count?.n||0)>=30)return reply({error:'Demo limit: 30 uploaded images per account.'},400);
   const type=request.headers.get('content-type')||'';if(!['image/jpeg','image/png','image/webp'].includes(type))return reply({error:'Choose a JPEG, PNG or WebP image.'},400);
   const reader=request.body?.getReader();if(!reader)return reply({error:'Image is empty'},400);const chunks:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024){await reader.cancel();return reply({error:'Each image must be under 4 MB.'},400);}chunks.push(value);}}finally{reader.releaseLock();}
   const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
   const valid=size>12&&(type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/png'?[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b):new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP');if(!valid)return reply({error:'The file content does not match its image type.'},400);
   const id=crypto.randomUUID();const key='owner-images/'+id;await bucket().put(key,bytes,{httpMetadata:{contentType:type}});try{await database.prepare('INSERT INTO owner_images (id,owner_id,object_key,content_type,created_at) VALUES (?,?,?,?,?)').bind(id,user.userId,key,type,new Date().toISOString()).run();}catch(e){await bucket().delete(key);throw e;}return reply({id},201);
  }
  let body:unknown;try{body=await readBody(request,formFlow);if(formFlow){const f=body as Record<string,string>;body=action==='hold'?{venueSlug:f.venueSlug,date:f.date,guests:Number(f.guests),packageId:f.packageId,addons:f.addons?f.addons.split(','):[]}:action==='confirm'?{holdId:f.holdId,acknowledgeDemo:f.acknowledgeDemo==='yes'}:{holdId:f.holdId};}}catch{return reply({error:'Invalid or oversized JSON request'},400);}
  if(action==='hold'){
   const parsed=selectionSchema.safeParse(body);if(!parsed.success)return reply({error:parsed.error.issues[0].message},400);const s=parsed.data;const {venue,pricing}=await venuePricing(s.venueSlug);if(s.guests>venue.capacity)return reply({error:'Guest count exceeds venue capacity.'},400);
   const quote=makeQuote(venue,pricing,s);const id=crypto.randomUUID();const expiresAt=now+HOLD_SECONDS;
   const result=await database.prepare(holdSQL).bind(venue.slug,s.date,id,user.userId,expiresAt,JSON.stringify(quote),now).first();if(!result)return reply({error:'This date was just held or booked. Choose another available date.'},409);return reply({id,expiresAt,quote,serverTime:now},201);
  }
  if(action==='confirm'||action==='release'){
   const parsed=z.object({holdId:z.string().uuid(),...(action==='confirm'?{acknowledgeDemo:z.literal(true)}:{})}).strict().safeParse(body);if(!parsed.success)return reply({error:'Invalid hold request'},400);const holdId=parsed.data.holdId;
   if(action==='release'){await database.prepare("UPDATE demo_slots SET status='available',hold_id=NULL,user_id=NULL,quote_json=NULL,expires_at=NULL WHERE hold_id=? AND user_id=? AND status='held'").bind(holdId,user.userId).run();return reply({released:true});}
   const existing=await database.prepare('SELECT id FROM demo_bookings WHERE hold_id=? AND user_id=?').bind(holdId,user.userId).first<{id:string}>();if(existing)return reply({id:existing.id});
   const id=crypto.randomUUID();await database.batch([database.prepare(confirmInsertSQL).bind(id,new Date().toISOString(),holdId,user.userId,now),database.prepare(confirmSlotSQL).bind(holdId,holdId,user.userId,holdId)]);
   const booking=await database.prepare('SELECT id FROM demo_bookings WHERE hold_id=? AND user_id=?').bind(holdId,user.userId).first<{id:string}>();if(!booking)return reply({error:'Your hold expired or was released. Select the date again.'},409);return reply({id:booking.id},201);
  }
  if(action==='pricing'){
   if(!isAdmin(user))throw new Error('FORBIDDEN');const parsed=z.object({venueSlug:z.string(),pricing:pricingSchema}).strict().safeParse(body);if(!parsed.success||!venues.some(v=>v.slug===parsed.data?.venueSlug))return reply({error:'Invalid venue or pricing.'},400);
   await database.prepare('INSERT INTO demo_venue_settings (venue_slug,pricing_json,updated_at) VALUES (?,?,?) ON CONFLICT(venue_slug) DO UPDATE SET pricing_json=excluded.pricing_json,updated_at=excluded.updated_at').bind(parsed.data.venueSlug,JSON.stringify(parsed.data.pricing),new Date().toISOString()).run();return reply({saved:true});
  }
  if(action==='drafts'){
   const parsed=draftSchema.safeParse(body);if(!parsed.success)return reply({error:parsed.error.issues[0].message},400);const d=parsed.data;
   for(const id of d.images){const image=await database.prepare('SELECT id FROM owner_images WHERE id=? AND owner_id=?').bind(id,user.userId).first();if(!image)return reply({error:'Choose images uploaded by your account.'},400);}
   if(d.submit&&!d.images.length)return reply({error:'Add at least one image before submitting for review.'},400);
   const stamp=new Date().toISOString();const saved=await database.prepare("INSERT INTO owner_drafts (id,owner_id,data_json,status,review_note,created_at,updated_at) VALUES (?,?,?,?,'',?,?) ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,status=excluded.status,review_note='',updated_at=excluded.updated_at WHERE owner_drafts.owner_id=excluded.owner_id RETURNING id").bind(d.id,user.userId,JSON.stringify(d),d.submit?'pending_review':'draft',stamp,stamp).first();if(!saved)throw new Error('FORBIDDEN');return reply({id:d.id,status:d.submit?'pending_review':'draft'});
  }
  if(action==='review'){
   if(!isAdmin(user))throw new Error('FORBIDDEN');const parsed=z.object({id:z.string().uuid(),status:z.enum(['approved_for_demo','changes_requested']),note:z.string().trim().min(5).max(1000)}).strict().safeParse(body);if(!parsed.success)return reply({error:'Add a review note (5-1000 characters).'},400);
   const r=await database.prepare("UPDATE owner_drafts SET status=?,review_note=?,updated_at=? WHERE id=? AND status='pending_review' RETURNING id").bind(parsed.data.status,parsed.data.note,new Date().toISOString(),parsed.data.id).first();if(!r)return reply({error:'This draft is no longer awaiting review. Refresh the workspace.'},409);return reply({reviewed:true});
  }
  return reply({error:'Not found'},404);
 }catch(error){return apiError(error);}
}
