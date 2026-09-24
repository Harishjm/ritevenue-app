import {db} from '@/lib/db';
import {readBody} from '@/lib/demo-server';
import {digest} from '@/lib/venue-intake';
import {venueEnquirySchema,VENUE_ENQUIRY_CONSENT_VERSION} from '@/lib/venue-enquiries';
import {publicVenue} from '@/lib/public-venues';
import {publicDateStatus} from '@/lib/publication';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers});

export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Please submit from the RiteVenue website.'},403);
 let body:unknown;try{body=await readBody(request);}catch{return json({error:'Check the enquiry details and try again.'},400);}
 const parsed=venueEnquirySchema.safeParse(body);if(!parsed.success)return json({error:parsed.error.issues[0].message,field:parsed.error.issues[0].path[0]},400);
 const {requestKey,website,...venue}=parsed.data;if(website)return json({error:'Unable to accept this enquiry.'},400);
 try{
    const listing=await publicVenue(venue.venueSlug);if(!listing)return json({error:'Venue not found.'},404);if(publicDateStatus(listing.calendar,venue.eventDate,listing.calendarUpdatedAt||'')!=='available')return json({error:'Choose a date currently shown as an enquiry date.'},409);
  const database=db(),payload={...venue,venueName:listing.name,venueLocality:listing.area,venueDate:venue.eventDate,location:`${listing.name}, ${listing.area}`,datePreference:'exact',eventMonth:'',guests:1,food:'undecided',help:'venue',planner:'undecided',budget:'undecided',budgetScope:'venue',contactMethod:'phone',notes:`Venue date enquiry for ${listing.name} on ${venue.eventDate}.`,source:'venue-calendar',medium:'',campaign:''},serialized=JSON.stringify(payload),hash=await digest(serialized),existing=await database.prepare('SELECT id,payload_hash FROM wedding_enquiries WHERE request_key=?').bind(requestKey).first<{id:string;payload_hash:string}>();
  if(existing)return existing.payload_hash===hash?json({reference:existing.id},200):json({error:'This enquiry was already submitted with different details.'},409);
  const id=crypto.randomUUID(),stamp=new Date().toISOString(),network=await digest(`venue-enquiry:${Math.floor(Date.now()/86400000)}:${request.headers.get('cf-connecting-ip')||'unknown'}`);
  await database.batch([database.prepare('DELETE FROM wedding_enquiry_limits WHERE expires_at<=?').bind(Math.floor(Date.now()/1000)),database.prepare('INSERT INTO wedding_enquiry_limits (id,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1').bind(network,Math.floor(Date.now()/1000)+86400),database.prepare("INSERT INTO wedding_enquiries (id,request_key,payload_hash,data_json,status,coordinator,follow_up_on,revision,consent_version,created_at,updated_at) SELECT ?,?,?,?,'new','','',?,?,?,? WHERE (SELECT attempts FROM wedding_enquiry_limits WHERE id=?)<=5 ON CONFLICT(request_key) DO NOTHING").bind(id,requestKey,hash,serialized,crypto.randomUUID(),VENUE_ENQUIRY_CONSENT_VERSION,stamp,stamp,network)]);
  const saved=await database.prepare('SELECT id,payload_hash FROM wedding_enquiries WHERE request_key=?').bind(requestKey).first<{id:string;payload_hash:string}>();if(!saved)return json({error:'You have reached the enquiry limit. Please try again later.'},429);if(saved.payload_hash!==hash)return json({error:'This enquiry changed. Please submit it again.'},409);return json({reference:saved.id},saved.id===id?201:200);
 }catch{return json({error:'We could not send your enquiry. Please try again.'},503);}
}