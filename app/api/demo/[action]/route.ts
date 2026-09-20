import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db} from '@/lib/db';
import {isPublicDirectory} from '@/lib/launch';
import {publicationSchema} from '@/lib/publication';
import {calendarSnapshot,unavailableVenues} from '@/lib/calendar';
import {apiUser,apiError,isAdmin,noStore,readBody,catalogPricing,venuePricing,venueCatalog} from '@/lib/demo-server';
import {venues,venueTypes,indiaToday} from '@/lib/venues';
import {dateSchema,selectionSchema,packageIdSchema,extraHoursSchema,makeQuote,HOLD_SECONDS,holdSQL,ownerHoldSQL,holdBindings,confirmInsertSQL,confirmSlotSQL,pricingSchema,validDate} from '@/lib/booking';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:noStore});
import {draftSchema} from '@/lib/owner-venue';
import {intakeDataSchema} from '@/lib/venue-intake';
function bucket(){const b=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(!b)throw new Error('Storage unavailable');return b;}
export async function GET(request:Request,{params}:{params:Promise<{action:string}>}){
 try{const user=await apiUser();const {action}=await params;const url=new URL(request.url);if(isPublicDirectory()&&['catalog','calendar'].includes(action)&&!isAdmin(user))throw new Error('FORBIDDEN');const database=db();const now=Math.floor(Date.now()/1000);
  if(action==='session')return json({admin:isAdmin(user),name:user.displayName});
  if(action==='catalog')return json(await venueCatalog());
  if(action==='calendar'){
   const slug=url.searchParams.get('venue');const month=url.searchParams.get('month');const date=url.searchParams.get('date');const selectedPackage=packageIdSchema.safeParse(url.searchParams.get('package')||'marriage-24h');const selectedHours=extraHoursSchema.safeParse(Number(url.searchParams.get('extraHours')||0));if(!selectedPackage.success||!selectedHours.success)return json({error:'Invalid package or extra hours'},400);const packageId=selectedPackage.data,extraHours=selectedHours.data;
   if(date){if(!dateSchema.safeParse(date).success)return json({error:'Choose a date in the next 12 months.'},400);return json({unavailable:await unavailableVenues(date,packageId,extraHours),serverTime:now});}
   if(!slug||!month||!/^\d{4}-\d{2}$/.test(month)||!validDate(month+'-01'))return json({error:'Invalid calendar request'},400);
   await venuePricing(slug);return json(await calendarSnapshot(slug,month,user.userId,packageId,extraHours));
  }
  if(action==='bookings'){const rows=await database.prepare('SELECT id,venue_slug,event_date,quote_json,created_at FROM demo_bookings WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user.userId).all();return json({bookings:rows.results.map(r=>({...r,quote:JSON.parse(String(r.quote_json)),quote_json:undefined}))});}
  if(action==='drafts'||action==='admin'){
   if(action==='admin'&&!isAdmin(user))throw new Error('FORBIDDEN');
   const rows=await (action==='admin'?database.prepare('SELECT id,data_json,status,review_note,updated_at FROM owner_drafts ORDER BY updated_at DESC LIMIT 100'):database.prepare('SELECT id,data_json,status,review_note,updated_at FROM owner_drafts WHERE owner_id=? ORDER BY updated_at DESC LIMIT 100').bind(user.userId)).all();
   const bookings=isAdmin(user)?await database.prepare('SELECT id,venue_slug,event_date,quote_json,created_at FROM demo_bookings ORDER BY created_at DESC LIMIT 100').all():null;
   const reviews=action==='admin'?await database.prepare('SELECT draft_id,decision,note,created_at FROM venue_review_events ORDER BY created_at DESC LIMIT 500').all():null;
   return json({drafts:rows.results.map(r=>({...r,data:JSON.parse(String(r.data_json)),data_json:undefined,reviews:reviews?.results.filter(review=>review.draft_id===r.id)})),bookings:bookings?.results.map(r=>({...r,quote:JSON.parse(String(r.quote_json)),quote_json:undefined})),pricing:isAdmin(user)?await catalogPricing():undefined});
  }
  if(action==='image'){
   const id=url.searchParams.get('id');if(!id||!z.string().uuid().safeParse(id).success)throw new Error('NOT_FOUND');const record=await database.prepare('SELECT owner_id,object_key,content_type FROM owner_images WHERE id=?').bind(id).first<{owner_id:string;object_key:string;content_type:string}>();if(!record)throw new Error('NOT_FOUND');
   if(record.owner_id!==user.userId&&!isAdmin(user)){if(isPublicDirectory())throw new Error('NOT_FOUND');const approved=await database.prepare("SELECT d.id FROM owner_drafts d,json_each(d.data_json,'$.images') image WHERE d.status='approved_for_demo' AND d.owner_id=? AND image.value=? LIMIT 1").bind(record.owner_id,id).first();if(!approved){const catering=await database.prepare("SELECT d.id FROM catering_drafts d,json_each(d.data_json,'$.images') image WHERE d.status='approved_for_demo' AND d.owner_id=? AND image.value=? LIMIT 1").bind(record.owner_id,id).first();if(!catering)throw new Error('NOT_FOUND');}}const image=await bucket().get(record.object_key);if(!image)throw new Error('NOT_FOUND');return new Response(image.body,{headers:{...noStore,'Content-Type':record.content_type,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});
  }
  return json({error:'Not found'},404);
 }catch(error){return apiError(error);}
}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 try{const user=await apiUser(request);const {action:requestedAction}=await params;if(isPublicDirectory()&&['hold','confirm','release','start-checkout','complete-checkout','cancel-checkout'].includes(requestedAction))return json({error:'Online booking, date holds and payments are not available during the directory launch.'},410);const formFlow=['start-checkout','complete-checkout','cancel-checkout'].includes(requestedAction);const action=({'start-checkout':'hold','complete-checkout':'confirm','cancel-checkout':'release'} as Record<string,string>)[requestedAction]||requestedAction;const database=db();const now=Math.floor(Date.now()/1000);
  const reply=(data:any,status=200)=>{if(!formFlow)return json(data,status);const path=status>=400?'/checkout/problem?code='+(status===409?'not_available':status===400?'invalid_input':'service_unavailable'):action==='hold'?'/checkout/'+data.id:action==='confirm'?'/bookings/'+data.id:'/bookings';return Response.redirect(new URL(path,request.url),303);};
  if(action==='images'){
   const count=await database.prepare('SELECT count(*) AS n FROM owner_images WHERE owner_id=?').bind(user.userId).first<{n:number}>();if((count?.n||0)>=30)return reply({error:'Demo limit: 30 uploaded images per account.'},400);
   const type=request.headers.get('content-type')||'';if(!['image/jpeg','image/png','image/webp'].includes(type))return reply({error:'Choose a JPEG, PNG or WebP image.'},400);
   const reader=request.body?.getReader();if(!reader)return reply({error:'Image is empty'},400);const chunks:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024){await reader.cancel();return reply({error:'Each image must be under 4 MB.'},400);}chunks.push(value);}}finally{reader.releaseLock();}
   const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
   const valid=size>12&&(type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/png'?[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b):new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP');if(!valid)return reply({error:'The file content does not match its image type.'},400);
   const id=crypto.randomUUID();const key='owner-images/'+id;await bucket().put(key,bytes,{httpMetadata:{contentType:type}});try{await database.prepare('INSERT INTO owner_images (id,owner_id,object_key,content_type,created_at) VALUES (?,?,?,?,?)').bind(id,user.userId,key,type,new Date().toISOString()).run();}catch(e){await bucket().delete(key);throw e;}return reply({id},201);
  }
  let body:unknown;try{body=await readBody(request,formFlow);if(formFlow){const f=body as Record<string,string>;body=action==='hold'?{venueSlug:f.venueSlug,date:f.date,guests:Number(f.guests),packageId:f.packageId,extraHours:Number(f.extraHours||0),addons:f.addons?f.addons.split(','):[]}:action==='confirm'?{holdId:f.holdId,acknowledgeDemo:f.acknowledgeDemo==='yes'}:{holdId:f.holdId};}}catch{return reply({error:'Invalid or oversized JSON request'},400);}
  if(action==='hold'){
   const parsed=selectionSchema.safeParse(body);if(!parsed.success)return reply({error:parsed.error.issues[0].message},400);const s=parsed.data;const {venue,pricing,approval}=await venuePricing(s.venueSlug);if(s.guests>venue.capacity)return reply({error:'Guest count exceeds venue capacity.'},400);
   const quote=makeQuote(venue,pricing,s);const id=crypto.randomUUID();const expiresAt=now+HOLD_SECONDS;
   const args=holdBindings(venue.slug,s.date,id,user.userId,expiresAt,quote,now,approval);const result=await database.prepare(approval?ownerHoldSQL:holdSQL).bind(...args).first();if(!result)return reply({error:'This access period overlaps a held or booked event, or the listing changed. Choose another available date or package.'},409);return reply({id,expiresAt,quote,serverTime:now},201);
  }
  if(action==='confirm'||action==='release'){
   const parsed=z.object({holdId:z.string().uuid(),...(action==='confirm'?{acknowledgeDemo:z.literal(true)}:{})}).strict().safeParse(body);if(!parsed.success)return reply({error:'Invalid hold request'},400);const holdId=parsed.data.holdId;
   if(action==='release'){await database.prepare("UPDATE demo_slots SET status='available',hold_id=NULL,user_id=NULL,quote_json=NULL,expires_at=NULL WHERE hold_id=? AND user_id=? AND status='held'").bind(holdId,user.userId).run();return reply({released:true});}
   const existing=await database.prepare('SELECT id FROM demo_bookings WHERE hold_id=? AND user_id=?').bind(holdId,user.userId).first<{id:string}>();if(existing)return reply({id:existing.id});
   const id=crypto.randomUUID();await database.batch([database.prepare(confirmInsertSQL).bind(id,new Date().toISOString(),holdId,user.userId,now),database.prepare(confirmSlotSQL).bind(holdId,holdId,user.userId,holdId)]);
   const booking=await database.prepare('SELECT id FROM demo_bookings WHERE hold_id=? AND user_id=?').bind(holdId,user.userId).first<{id:string}>();if(!booking)return reply({error:'Your hold expired or was released. Select the date again.'},409);return reply({id:booking.id},201);
  }
  if(action==='public-calendar'){
   const parsed=z.object({id:z.string().uuid(),calendar:publicationSchema.shape.calendar,expectedUpdatedAt:z.string().min(1).max(64)}).strict().safeParse(body);
   if(!parsed.success)return reply({error:'Check the calendar dates and unavailable dates.'},400);
   const d=parsed.data;const current=await database.prepare("SELECT data_json FROM owner_drafts WHERE id=? AND owner_id=? AND status='approved_public' AND updated_at=?").bind(d.id,user.userId,d.expectedUpdatedAt).first<{data_json:string}>();
   if(!current)return reply({error:'This listing changed, is not public, or belongs to another account. Refresh and reopen it.'},409);
   const data=draftSchema.parse(JSON.parse(current.data_json));data.publication.calendar=d.calendar;data.publication.calendarUpdatedAt=d.calendar?new Date().toISOString():null;
   const result=await database.prepare("UPDATE owner_drafts SET data_json=?,updated_at=? WHERE id=? AND owner_id=? AND status='approved_public' AND updated_at=? AND data_json=? RETURNING id").bind(JSON.stringify(data),new Date().toISOString(),d.id,user.userId,d.expectedUpdatedAt,current.data_json).first();
   if(!result)return reply({error:'This calendar changed. Refresh before trying again.'},409);return reply({saved:true});
  }
  if(action==='pricing'){
   if(!isAdmin(user))throw new Error('FORBIDDEN');const parsed=z.object({venueSlug:z.string(),pricing:pricingSchema}).strict().safeParse(body);if(!parsed.success||!venues.some(v=>v.slug===parsed.data?.venueSlug))return reply({error:'Invalid venue or pricing.'},400);
   await database.prepare('INSERT INTO demo_venue_settings (venue_slug,pricing_json,updated_at) VALUES (?,?,?) ON CONFLICT(venue_slug) DO UPDATE SET pricing_json=excluded.pricing_json,updated_at=excluded.updated_at').bind(parsed.data.venueSlug,JSON.stringify(parsed.data.pricing),new Date().toISOString()).run();return reply({saved:true});
  }
  if(action==='drafts'){
   const parsed=draftSchema.safeParse(body);if(!parsed.success)return reply({error:parsed.error.issues[0].message},400);const d=parsed.data;d.publication.calendarUpdatedAt=d.publication.calendar?new Date().toISOString():null;
   for(const id of d.images){const image=await database.prepare('SELECT id FROM owner_images WHERE id=? AND owner_id=?').bind(id,user.userId).first();if(!image)return reply({error:'Choose images uploaded by your account.'},400);}
   if(d.submit&&!d.images.length)return reply({error:'Add at least one image before submitting for review.'},400);
   const stamp=new Date().toISOString();const saved=await database.prepare("INSERT INTO owner_drafts (id,owner_id,data_json,status,review_note,created_at,updated_at) VALUES (?,?,?,?,'',?,?) ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,status=excluded.status,review_note='',updated_at=excluded.updated_at WHERE owner_drafts.owner_id=excluded.owner_id RETURNING id").bind(d.id,user.userId,JSON.stringify(d),d.submit?'pending_review':'draft',stamp,stamp).first();if(!saved)throw new Error('FORBIDDEN');return reply({id:d.id,status:d.submit?'pending_review':'draft'});
  }
  if(action==='review'){
   if(!isAdmin(user))throw new Error('FORBIDDEN');const parsed=z.object({id:z.string().uuid(),status:z.enum(['approved_for_demo','approved_public','changes_requested','rejected']),note:z.string().trim().min(5).max(1000),expectedUpdatedAt:z.string().min(1).max(64)}).strict().safeParse(body);if(!parsed.success)return reply({error:'Add a review note (5-1000 characters).'},400);
   let reviewedPayload:string|null=null;
   if(parsed.data.status==='approved_public'){
    const pending=await database.prepare("SELECT data_json FROM owner_drafts WHERE id=? AND status='pending_review' AND updated_at=?").bind(parsed.data.id,parsed.data.expectedUpdatedAt).first<{data_json:string}>();
    if(!pending)return reply({error:'This draft changed. Refresh before publishing.'},409);
    reviewedPayload=pending.data_json;
    const d=draftSchema.safeParse(JSON.parse(pending.data_json));
    if(!d.success||!d.data.publication.consent||!d.data.images.length)return reply({error:'Public publication requires explicit owner consent and owner-supplied photos.'},400);
   }
   const eventId=crypto.randomUUID(),nowStamp=new Date().toISOString(),stamp=nowStamp===parsed.data.expectedUpdatedAt?new Date(Date.now()+1).toISOString():nowStamp;
   await database.batch([
    database.prepare("UPDATE owner_drafts SET status=?,review_note=?,updated_at=? WHERE id=? AND status='pending_review' AND updated_at=? AND (? IS NULL OR data_json=?)").bind(parsed.data.status,parsed.data.note,stamp,parsed.data.id,parsed.data.expectedUpdatedAt,reviewedPayload,reviewedPayload),
    database.prepare('INSERT INTO venue_review_events (id,draft_id,reviewer_id,decision,note,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM owner_drafts WHERE id=? AND status=? AND updated_at=?)').bind(eventId,parsed.data.id,user.userId,parsed.data.status,parsed.data.note,stamp,parsed.data.id,parsed.data.status,stamp)
   ]);
   const event=await database.prepare('SELECT id FROM venue_review_events WHERE id=?').bind(eventId).first();if(!event)return reply({error:'This draft is no longer awaiting review. Refresh the workspace.'},409);return reply({reviewed:true});
  }
  if(action==='review_intake'){
   if(!isAdmin(user))throw new Error('FORBIDDEN');const parsed=z.object({id:z.string().uuid(),status:z.enum(['rejected','new']),note:z.string().trim().min(5).max(1000),expectedStatus:z.enum(['new','rejected'])}).strict().safeParse(body);if(!parsed.success)return reply({error:'Add an intake review note (5-1000 characters).'},400);
   if(parsed.data.status===parsed.data.expectedStatus)return reply({error:'Choose a different intake status.'},400);
   const result=await database.prepare("UPDATE public_venue_intakes SET status=?,review_note=?,reviewed_by=?,reviewed_at=? WHERE id=? AND status=? AND converted_draft_id IS NULL RETURNING id").bind(parsed.data.status,parsed.data.note,user.userId,new Date().toISOString(),parsed.data.id,parsed.data.expectedStatus).first();
   if(!result)return reply({error:'This application changed or was already converted. Refresh the inbox.'},409);return reply({reviewed:true});
  }
   if(action==='convert_intake'){
    if(!isAdmin(user))throw new Error('FORBIDDEN');
    const parsed=z.object({id:z.string().uuid()}).strict().safeParse(body);if(!parsed.success)return reply({error:'Invalid intake id'},400);
    const intake=await database.prepare('SELECT data_json,status,converted_draft_id FROM public_venue_intakes WHERE id=?').bind(parsed.data.id).first<{data_json:string;status:string;converted_draft_id:string|null}>();
    if(!intake)return reply({error:'Not found'},404);
    if(intake.status==='converted'&&intake.converted_draft_id)return reply({created:false,id:intake.converted_draft_id});
    if(intake.status!=='new')return reply({error:'This application cannot be converted in its current state.'},409);
    const data=intakeDataSchema.safeParse(JSON.parse(intake.data_json));if(!data.success)return reply({error:'The application data is invalid.'},409);
    const draftId=crypto.randomUUID(),stamp=new Date().toISOString(),description=data.data.notes.length>=40?data.data.notes:`Application received from ${data.data.contactName}. Complete and verify the venue description before requesting publication.`;
    const draft=draftSchema.parse({id:draftId,name:data.data.venueName.slice(0,100),locality:data.data.locality.slice(0,100),address:`${data.data.locality}, Bengaluru`,type:'Wedding hall',capacity:data.data.capacity,description,pricing:{rent:10000000,ac:0,generator:0,parking:0,cleaning:0},images:[],cateringPolicy:{},publication:{consent:false,calendar:null,calendarUpdatedAt:null},rightsConfirmed:false,submit:false});
    await database.batch([
     database.prepare("INSERT INTO owner_drafts (id,owner_id,data_json,status,review_note,created_at,updated_at) SELECT ?,?,?,\'draft\',\'\',?,? WHERE EXISTS (SELECT 1 FROM public_venue_intakes WHERE id=? AND status=\'new\' AND converted_draft_id IS NULL)").bind(draftId,user.userId,JSON.stringify(draft),stamp,stamp,parsed.data.id),
     database.prepare("UPDATE public_venue_intakes SET status=\'converted\',converted_draft_id=? WHERE id=? AND status=\'new\' AND EXISTS (SELECT 1 FROM owner_drafts WHERE id=?)").bind(draftId,parsed.data.id,draftId)
    ]);
    const converted=await database.prepare('SELECT converted_draft_id FROM public_venue_intakes WHERE id=?').bind(parsed.data.id).first<{converted_draft_id:string|null}>();if(!converted?.converted_draft_id)return reply({error:'The application changed. Refresh and try again.'},409);
    return reply({created:converted.converted_draft_id===draftId,id:converted.converted_draft_id},converted.converted_draft_id===draftId?201:200);
   }
  return reply({error:'Not found'},404);
 }catch(error){return apiError(error);}
}
