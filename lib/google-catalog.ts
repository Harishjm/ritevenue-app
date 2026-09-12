import {z} from 'zod';
// Matches discover_venue_ids.py. Reject extra Google fields, or imported claims/prices.
// Ownership and pricing must later be verified through a separate owner workflow.
export const catalogRowSchema=z.object({
 venue_uuid:z.string().uuid().refine(v=>v.split('-')[2]?.startsWith('4'),'Expected a UUID4'),
 google_place_id:z.string().min(1).max(512).regex(/^[A-Za-z0-9_-]+$/),
 locality:z.string().trim().min(1).max(200),category:z.literal('wedding_venue'),
 is_claimed_by_owner:z.literal(false),custom_base_price:z.null(),custom_capacity:z.null(),
 created_at:z.string().datetime({offset:true}).refine(v=>Number.isFinite(Date.parse(v)))
}).strict();
export const catalogImportSchema=z.array(catalogRowSchema).min(1).max(500).superRefine((rows,ctx)=>{
 const uuids=new Map<string,string>();for(const row of rows){const existing=uuids.get(row.venue_uuid);if(existing&&existing!==row.google_place_id)ctx.addIssue({code:'custom',message:'One UUID is mapped to multiple Google IDs'});uuids.set(row.venue_uuid,row.google_place_id);}
});
export type CatalogRow=z.infer<typeof catalogRowSchema>;
export type VenueReference={venue_uuid:string;google_place_id:string;locality:string};
export function uniqueRows(rows:CatalogRow[]){return [...new Map(rows.map(row=>[row.google_place_id,row])).values()];}
export function safeHttps(value:unknown):string|null{if(typeof value!=='string')return null;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export type GoogleVenue={venue_uuid:string;locality:string;name:string|null;address:string|null;mapsUrl:string|null;businessStatus:string|null;photo:{uri:string;sourceUrl:string;authors:{name:string;uri:string|null;photoUri:string|null}[]}|null;providerAttributions:{name:string;uri:string|null}[];error?:string};
export async function readLimitedJson(request:Request){
 if(!request.headers.get('content-type')?.includes('application/json'))throw new Error('Expected a JSON catalog');
 const reader=request.body?.getReader();if(!reader)throw new Error('No catalog supplied');
 const parts:Uint8Array[]=[];let bytes=0;try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>524288){await reader.cancel();throw new Error('Catalog must be smaller than 512 KB');}parts.push(value);}}finally{reader.releaseLock();}
 const buffer=new Uint8Array(bytes);let cursor=0;for(const part of parts){buffer.set(part,cursor);cursor+=part.byteLength;}
 try{return JSON.parse(new TextDecoder().decode(buffer));}catch{throw new Error('Catalog is not valid JSON');}
}
