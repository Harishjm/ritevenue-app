import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db} from '@/lib/db';
import {publicVenues,publicVenue,type PublicVenue} from '@/lib/public-venues';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function visiblePricing(venue:PublicVenue){if(venue.authorizationSource==='admin')return null;const status=venue.packageAvailability,price=venue.pricing;return {...price,rent:status.rent==='available'?price.rent:null,marriageRent:status.marriageRent==='available'?price.marriageRent:null,morningRent:status.morningRent==='available'?price.morningRent:null,eveningRent:status.eveningRent==='available'?price.eveningRent:null};}
export async function GET(request:Request,{params}:{params:Promise<{action:string}>}){try{const {action}=await params;const url=new URL(request.url);
 if(action==='catalog'){const venues=await publicVenues();return Response.json({venues:venues.map(venue=>({...venue,pricing:visiblePricing(venue),packageAvailability:venue.authorizationSource==='admin'?null:venue.packageAvailability,cateringPolicy:venue.authorizationSource==='admin'?null:venue.cateringPolicy}))},{headers});}
 if(action==='calendar'){const venue=await publicVenue(url.searchParams.get('venue')||'');if(!venue)return Response.json({error:'Venue not found'},{status:404,headers});return Response.json({calendar:venue.calendar,updatedAt:venue.calendarUpdatedAt,notice:'Reported dates only. No date is reserved through this website.'},{headers});}
 if(action==='image'){
  const id=url.searchParams.get('id');if(!z.string().uuid().safeParse(id).success)return new Response('Not found',{status:404,headers});
  const row=await db().prepare("SELECT i.object_key,i.content_type FROM owner_images i WHERE i.id=? AND EXISTS (SELECT 1 FROM owner_drafts d,json_each(d.data_json,'$.images') photo WHERE d.owner_id=i.owner_id AND d.status='approved_public' AND json_extract(d.data_json,'$.publication.consent')=1 AND photo.value=i.id)").bind(id).first<{object_key:string;content_type:string}>();
  if(!row)return new Response('Not found',{status:404,headers});const bucket=(env as unknown as {BUCKET:R2Bucket}).BUCKET;const image=await bucket.get(row.object_key);if(!image)return new Response('Not found',{status:404,headers});return new Response(image.body,{headers:{...headers,'Content-Type':row.content_type,'Content-Security-Policy':"default-src 'none'"}});
 }
 return Response.json({error:'Not found'},{status:404,headers});
}catch{return Response.json({error:'Venue information is temporarily unavailable. Please retry.'},{status:503,headers});}}
