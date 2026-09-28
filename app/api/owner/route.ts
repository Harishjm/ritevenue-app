import {z} from 'zod';
import {AuthError,consumeRate,isAdminUser} from '@/lib/auth';
import {readBody} from '@/lib/demo-server';
import {db} from '@/lib/db';
import {portalUser,portalList,createWorkspace,saveWorkspace,withdrawSubmission,reviewWorkspace,inviteOwner,acceptInvite,workspace} from '@/lib/owner-portal-server';
export const dynamic='force-dynamic';
export const portalHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'};
export const portalJson=(data:unknown,status=200)=>Response.json(data,{status,headers:portalHeaders});
export function portalError(error:unknown){return portalJson({error:error instanceof AuthError?error.message:error instanceof z.ZodError?error.issues[0].message:'Unable to complete the request. Please retry.'},error instanceof AuthError?error.status:error instanceof z.ZodError?400:503);}
export async function GET(request:Request){try{
 const user=await portalUser(request),id=new URL(request.url).searchParams.get('venue');
 if(id){const row=await workspace(user,z.string().uuid().parse(id));return portalJson({id:row.id,revision:row.revision,status:row.status,data:JSON.parse(row.data_json)});}
 return portalJson(await portalList(user));
}catch(error){return portalError(error);}}
export async function POST(request:Request){try{
 const user=await portalUser(request);await consumeRate('owner-write:'+user.userId,600,Math.floor(Date.now()/1000),3600);
 let raw:unknown;try{raw=await readBody(request);}catch{throw new AuthError(400,'Invalid request.');}
 const action=z.discriminatedUnion('action',[
  z.object({action:z.literal('open'),id:z.string().uuid()}).strict(),
  z.object({action:z.literal('save'),id:z.string().uuid(),revision:z.number().int().positive(),data:z.unknown(),submit:z.boolean()}).strict(),
  z.object({action:z.literal('withdraw'),id:z.string().uuid(),revision:z.number().int().positive()}).strict(),
  z.object({action:z.literal('review'),id:z.string().uuid(),revision:z.number().int().positive(),decision:z.enum(['published','changes_requested','rejected']),note:z.string().trim().min(5).max(1000)}).strict(),
  z.object({action:z.literal('invite'),id:z.string().uuid(),email:z.string().email().max(254),note:z.string().trim().min(10).max(1000)}).strict(),
  z.object({action:z.literal('accept'),id:z.string().uuid()}).strict(),
  z.object({action:z.literal('unpublish'),id:z.string().uuid(),revision:z.number().int().positive()}).strict(),
  z.object({action:z.literal('withdraw_publication'),id:z.string().uuid(),revision:z.number().int().positive()}).strict()
 ]).parse(raw);
 if(action.action==='open'){const row=await createWorkspace(user,action.id);return portalJson({id:row.id,revision:row.revision,status:row.status,data:JSON.parse(row.data_json)});}
 if(action.action==='save')return portalJson(await saveWorkspace(user,action.id,action.revision,action.data,action.submit));
 if(action.action==='withdraw')await withdrawSubmission(user,action.id,action.revision);
 if(action.action==='review')await reviewWorkspace(user,action.id,action.revision,action.decision,action.note);
 if(action.action==='invite')return portalJson(await inviteOwner(user,action.id,action.email,action.note));
 if(action.action==='accept')await acceptInvite(user,action.id);
 if(action.action==='unpublish'||action.action==='withdraw_publication'){
  if(action.action==='unpublish'&&!isAdminUser(user))throw new AuthError(403,'Administrator access required.');
  await workspace(user,action.id);const stamp=new Date().toISOString(),operation=crypto.randomUUID();
  const result=await db().batch([
   db().prepare("UPDATE venue_workspaces SET revision=revision+1,status='draft',submitted_revision=NULL,data_json=CASE WHEN ?=1 THEN json_set(data_json,'$.publication.consent',json('false')) ELSE data_json END,operation_id=?,updated_at=? WHERE id=? AND revision=?").bind(action.action==='withdraw_publication'?1:0,operation,stamp,action.id,action.revision),
   db().prepare("UPDATE owner_drafts SET status='draft',updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM venue_workspaces WHERE id=? AND operation_id=?)").bind(stamp,action.id,action.id,operation),
   db().prepare("INSERT INTO owner_review_events(id,venue_id,revision,actor_id,decision,note,created_at) SELECT ?,id,revision,?,'unpublished',?,? FROM venue_workspaces WHERE id=? AND operation_id=?").bind(crypto.randomUUID(),user.userId,action.action==='withdraw_publication'?'Venue representative withdrew publication permission':'Administrator removed the public listing',stamp,action.id,operation)
  ]);if(!result[0].meta.changes)throw new AuthError(409,'Listing changed. Reload it.');
 }
 return portalJson({ok:true});
}catch(error){return portalError(error);}}
