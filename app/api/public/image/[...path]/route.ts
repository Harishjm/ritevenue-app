import {env} from 'cloudflare:workers';
import {db} from '@/lib/db';
import {publicIndexingEnabled} from '@/lib/launch';

export const dynamic='force-dynamic';

export async function GET(_request:Request,{params}:{params:Promise<{path:string[]}>}){
 const {path}=await params;
 const [id,filename]=path;
 if(!id||!filename)return new Response('Not found',{status:404});
 const row=await db().prepare("SELECT i.object_key,i.content_type FROM owner_images i LEFT JOIN venue_photo vp ON vp.id=i.id WHERE i.id=? AND (vp.stored_filename=? OR (vp.id IS NULL AND i.object_key LIKE ?)) AND EXISTS (SELECT 1 FROM owner_drafts d,json_each(d.data_json,'$.images') image WHERE d.status='approved_public' AND json_extract(d.data_json,'$.publication.consent')=1 AND image.value=i.id)").bind(id,filename,`%/${filename}`).first<{object_key:string;content_type:string}>();
 if(!row)return new Response('Not found',{status:404});
 const image=await (env as unknown as {BUCKET:R2Bucket}).BUCKET.get(row.object_key);
 if(!image)return new Response('Not found',{status:404});
 return new Response(image.body,{headers:{'Cache-Control':'public, max-age=31536000, immutable','Content-Type':row.content_type,'X-Content-Type-Options':'nosniff','X-Robots-Tag':publicIndexingEnabled()?'index, follow':'noindex, nofollow','Content-Security-Policy':"default-src 'none'"}});
}