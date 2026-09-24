import {db} from './db';
import {draftSchema} from './owner-venue';
export async function publicVenues(){
 const rows=await db().prepare("SELECT id,data_json,updated_at FROM owner_drafts WHERE status='approved_public' AND json_extract(data_json,'$.publication.consent')=1 ORDER BY updated_at DESC,id").all<{id:string;data_json:string;updated_at:string}>();
 const photos=rows.results.length?(await db().prepare("SELECT i.id,COALESCE(vp.alt_text,p.description,'') AS description,COALESCE(vp.stored_filename,i.object_key) AS stored_filename FROM owner_images i LEFT JOIN intake_photos p ON p.id=i.id LEFT JOIN venue_photo vp ON vp.id=i.id WHERE EXISTS (SELECT 1 FROM owner_drafts d,json_each(d.data_json,'$.images') image WHERE d.status='approved_public' AND json_extract(d.data_json,'$.publication.consent')=1 AND d.owner_id=i.owner_id AND image.value=i.id)").all<{id:string;description:string;stored_filename:string}>()).results:[];
 const descriptions=new Map(photos.map(photo=>[photo.id,photo.description]));
 const filenames=new Map(photos.map(photo=>[photo.id,photo.stored_filename.split('/').pop()||photo.id]));
 return rows.results.flatMap(row=>{const parsed=draftSchema.safeParse(JSON.parse(row.data_json));if(!parsed.success||!parsed.data.publication.consent||!parsed.data.images.length||parsed.data.id!==row.id)return [];const d=parsed.data;return [{slug:'owner-'+row.id,name:d.name,area:d.locality,address:d.address,type:d.type,capacity:d.capacity,description:d.description,pricing:d.pricing,packageAvailability:d.packageAvailability,cateringPolicy:d.cateringPolicy,authorizationSource:d.publication.source,images:d.images.map(id=>`/api/public/image/${id}/${filenames.get(id)||id}`),imageDescriptions:d.images.map((id,i)=>descriptions.get(id)?`${d.name}, ${d.locality} — ${descriptions.get(id)}`:`${d.name}, ${d.locality} — venue photograph ${i+1}`),calendar:d.publication.calendar,calendarUpdatedAt:d.publication.calendarUpdatedAt,updatedAt:row.updated_at}];});
}
export type PublicVenue=Awaited<ReturnType<typeof publicVenues>>[number];
export async function publicVenue(slug:string){return (await publicVenues()).find(v=>v.slug===slug)||null;}
