import {db} from './db';
import {draftSchema} from './owner-venue';
export async function publicVenues(){
 const rows=await db().prepare("SELECT id,data_json,updated_at FROM owner_drafts WHERE status='approved_public' AND json_extract(data_json,'$.publication.consent')=1 ORDER BY updated_at DESC,id").all<{id:string;data_json:string;updated_at:string}>();
 return rows.results.flatMap(row=>{const parsed=draftSchema.safeParse(JSON.parse(row.data_json));if(!parsed.success||!parsed.data.publication.consent||!parsed.data.images.length||parsed.data.id!==row.id)return [];const d=parsed.data;return [{slug:'owner-'+row.id,name:d.name,area:d.locality,address:d.address,type:d.type,capacity:d.capacity,description:d.description,pricing:d.pricing,cateringPolicy:d.cateringPolicy,images:d.images.map(id=>'/api/public/image?id='+id),calendar:d.publication.calendar,calendarUpdatedAt:d.publication.calendarUpdatedAt,updatedAt:row.updated_at}];});
}
export type PublicVenue=Awaited<ReturnType<typeof publicVenues>>[number];
export async function publicVenue(slug:string){return (await publicVenues()).find(v=>v.slug===slug)||null;}
