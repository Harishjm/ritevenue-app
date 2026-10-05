import {z} from 'zod';
import {db} from './db';
import {getAuthenticatedUser,isAdminUser,AuthError,consumeRate,type AuthUser} from './auth';
import {workingVenueSchema,submissionVenue,importedWorkingVenue,newWorkingVenue,type WorkingVenue} from './owner-portal-domain';
import {ownerSubmissionReference} from './owner-submission-reference';

export type Workspace={id:string;created_by:string;data_json:string;revision:number;status:string;submitted_revision:number|null;review_note:string;updated_at:string};
export async function portalUser(request:Request){
 const user=await getAuthenticatedUser(request);if(!user)throw new AuthError(401,'Sign in to manage your venues.');
 if(request.method!=='GET'&&request.headers.get('origin')!==new URL(request.url).origin)throw new AuthError(403,'Submit from the RiteVenue website.');
 if(user.role==='admin'&&!isAdminUser(user))throw new AuthError(403,'Administrator access is unavailable.');
 return user;
}
export async function workspace(user:AuthUser,id:string){
 const row=await db().prepare('SELECT w.* FROM venue_workspaces w WHERE w.id=? AND (?=1 OR EXISTS(SELECT 1 FROM venue_members m WHERE m.venue_id=w.id AND m.user_id=?))').bind(id,isAdminUser(user)?1:0,user.userId).first<Workspace>();
 if(!row)throw new AuthError(404,'Venue not found.');return row;
}
export async function workspaceReference(id:string){
 const first=await db().prepare('SELECT data_json FROM venue_revisions WHERE venue_id=? ORDER BY revision ASC LIMIT 1').bind(id).first<{data_json:string}>();
 if(!first)return null;
 const name=JSON.parse(first.data_json).name;
 return ownerSubmissionReference(id,typeof name==='string'?name:'');
}
export async function portalList(user:AuthUser){
 const admin=isAdminUser(user),database=db();
 const rows=(await database.prepare("SELECT w.*,d.status AS public_status FROM venue_workspaces w LEFT JOIN owner_drafts d ON d.id=w.id WHERE ?=1 OR EXISTS(SELECT 1 FROM venue_members m WHERE m.venue_id=w.id AND m.user_id=?) ORDER BY w.updated_at DESC LIMIT 100").bind(admin?1:0,user.userId).all<Workspace&{public_status:string|null}>()).results;
 const invites=(await database.prepare("SELECT i.id,i.venue_id,json_extract(w.data_json,'$.name') AS name FROM venue_owner_invites i JOIN venue_workspaces w ON w.id=i.venue_id WHERE i.email=? AND i.accepted_by IS NULL AND i.revoked=0 AND i.expires_at>? ORDER BY i.expires_at DESC LIMIT 50").bind(user.email,Math.floor(Date.now()/1000)).all()).results;
 const venues=await Promise.all(rows.map(async row=>({id:row.id,revision:row.revision,status:row.status,submittedRevision:row.submitted_revision,reviewNote:row.review_note,updatedAt:row.updated_at,published:row.public_status==='approved_public',reference:await workspaceReference(row.id),data:JSON.parse(row.data_json),history:(await database.prepare('SELECT revision,decision,note,created_at FROM owner_review_events WHERE venue_id=? ORDER BY created_at DESC LIMIT 20').bind(row.id).all()).results})));
 return {venues,invites,email:user.email,admin};
}
export async function createWorkspace(user:AuthUser,id:string){
 z.string().uuid().parse(id);
 const exists=await db().prepare('SELECT id FROM venue_workspaces WHERE id=?').bind(id).first();
 if(exists)return workspace(user,id);
 await consumeRate('owner-create:'+user.userId,10,Math.floor(Date.now()/1000),86400);
 let data=newWorkingVenue(),createdBy=user.userId;
 const legacy=await db().prepare('SELECT owner_id,data_json FROM owner_drafts WHERE id=?').bind(id).first<{owner_id:string;data_json:string}>();
 if(legacy){
  if(!isAdminUser(user)&&legacy.owner_id!==user.userId)throw new AuthError(404,'Venue not found.');
  data=importedWorkingVenue(JSON.parse(legacy.data_json));createdBy=legacy.owner_id;
  const intake=await db().prepare('SELECT data_json FROM public_venue_intakes WHERE converted_draft_id=?').bind(id).first<{data_json:string}>();
  if(intake){const contact=JSON.parse(intake.data_json);data.contactName=contact.contactName||'';data.phone=contact.phone||'';}
 }
 const stamp=new Date().toISOString(),operation=crypto.randomUUID();
 await db().batch([
  db().prepare("INSERT INTO venue_workspaces(id,created_by,data_json,operation_id,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(id,createdBy,JSON.stringify(data),operation,stamp),
  db().prepare('INSERT INTO venue_members(venue_id,user_id) SELECT id,? FROM venue_workspaces WHERE id=? AND operation_id=? ON CONFLICT DO NOTHING').bind(user.userId,id,operation),
  db().prepare("INSERT INTO owner_portal_photos(id,venue_id,uploaded_by,object_key,ready,created_at) SELECT i.id,?,i.owner_id,i.object_key,1,? FROM owner_images i WHERE i.id IN (SELECT value FROM json_each(?,'$.images')) AND EXISTS(SELECT 1 FROM venue_workspaces WHERE id=? AND operation_id=?) ON CONFLICT DO NOTHING").bind(id,stamp,JSON.stringify(data),id,operation)
 ]);
 return workspace(user,id);
}
async function validatePhotos(id:string,data:WorkingVenue){
 for(const photo of data.images){if(!await db().prepare('SELECT id FROM owner_portal_photos WHERE id=? AND venue_id=? AND ready=1').bind(photo,id).first())throw new AuthError(400,'Choose photos uploaded to this venue.');}
}
export async function saveWorkspace(user:AuthUser,id:string,revision:number,input:unknown,submit:boolean){
 const row=await workspace(user,id);
 if(row.revision!==revision||row.status==='pending_review')throw new AuthError(409,row.status==='pending_review'?'Withdraw the submission before editing.':'This draft changed in another tab. Reload it before saving.');
 const data=workingVenueSchema.parse(input);
 if(!isAdminUser(user)&&data.publication.source!=='owner')throw new AuthError(403,'Only an administrator can select admin-direct publication.');
 await validatePhotos(id,data);
 if(submit){data.publication.calendarUpdatedAt=data.publication.calendar?new Date().toISOString():null;try{submissionVenue(id,data);}catch(error){throw new AuthError(400,error instanceof z.ZodError?error.issues[0].message:(error as Error).message);}}
 const reference=submit?(await workspaceReference(id))||ownerSubmissionReference(id,data.name):undefined;
 const operation=crypto.randomUUID(),stamp=new Date().toISOString(),next=revision+1;
 const status=submit?'pending_review':row.status==='changes_requested'?'changes_requested':'draft';
 const statements=[db().prepare('UPDATE venue_workspaces SET data_json=?,revision=?,status=?,submitted_revision=?,operation_id=?,updated_at=? WHERE id=? AND revision=? AND status!=\'pending_review\'').bind(JSON.stringify(data),next,status,submit?next:null,operation,stamp,id,revision)];
 if(submit){
  statements.push(db().prepare('INSERT INTO venue_revisions(venue_id,revision,data_json,submitted_by,created_at) SELECT id,revision,data_json,?,? FROM venue_workspaces WHERE id=? AND operation_id=?').bind(user.userId,stamp,id,operation));
  statements.push(db().prepare("INSERT INTO owner_review_events(id,venue_id,revision,actor_id,decision,note,created_at) SELECT ?,id,revision,?,'submitted','Submitted for review',? FROM venue_workspaces WHERE id=? AND operation_id=?").bind(crypto.randomUUID(),user.userId,stamp,id,operation));
 }
 const result=await db().batch(statements);if(!result[0].meta.changes)throw new AuthError(409,'This draft changed. Reload it before saving.');return {revision:next,status,reference};
}
export async function withdrawSubmission(user:AuthUser,id:string,revision:number){
 await workspace(user,id);const operation=crypto.randomUUID(),stamp=new Date().toISOString();
 const result=await db().batch([
 db().prepare("UPDATE venue_workspaces SET status='draft',revision=revision+1,operation_id=?,updated_at=? WHERE id=? AND revision=? AND status='pending_review'").bind(operation,stamp,id,revision),
 db().prepare("INSERT INTO owner_review_events(id,venue_id,revision,actor_id,decision,note,created_at) SELECT ?,id,revision,?,'withdrawn','Submission withdrawn for editing',? FROM venue_workspaces WHERE id=? AND operation_id=?").bind(crypto.randomUUID(),user.userId,stamp,id,operation)
 ]);if(!result[0].meta.changes)throw new AuthError(409,'The submission changed. Reload it.');
}
export async function reviewWorkspace(user:AuthUser,id:string,revision:number,decision:'published'|'changes_requested'|'rejected',note:string){
 if(!isAdminUser(user))throw new AuthError(403,'Administrator access required.');
 const row=await workspace(user,id);
 if(row.revision!==revision||row.status!=='pending_review'||row.submitted_revision!==revision)throw new AuthError(409,'This submission changed. Reload before reviewing.');
 const submitted=await db().prepare('SELECT data_json FROM venue_revisions WHERE venue_id=? AND revision=?').bind(id,revision).first<{data_json:string}>();
 if(!submitted)throw new AuthError(409,'Submitted version not found.');
 const data=workingVenueSchema.parse(JSON.parse(submitted.data_json));
 let published:string|null=null;
 if(decision==='published'){
  await validatePhotos(id,data);
  const listing=submissionVenue(id,data);
  if(listing.publication.source==='admin'){
   if(listing.publication.authorizationNote.length<20||listing.publication.calendar)throw new AuthError(400,'Record independent content rights and leave unverified dates unconfirmed.');
   for(const photo of listing.images)if(await db().prepare('SELECT id FROM intake_photos WHERE id=?').bind(photo).first())throw new AuthError(400,'Application photos need owner permission before publication.');
  }
  published=JSON.stringify(listing);
 }
 const operation=crypto.randomUUID(),stamp=new Date().toISOString();
 const statements=[db().prepare('UPDATE venue_workspaces SET status=?,review_note=?,revision=revision+1,operation_id=?,updated_at=? WHERE id=? AND revision=? AND status=\'pending_review\' AND submitted_revision=?').bind(decision,note,operation,stamp,id,revision,revision),
 db().prepare('INSERT INTO owner_review_events(id,venue_id,revision,actor_id,decision,note,created_at) SELECT ?,id,?,?,?, ?,? FROM venue_workspaces WHERE id=? AND operation_id=?').bind(crypto.randomUUID(),revision,user.userId,decision,note,stamp,id,operation)];
 if(published)statements.push(db().prepare("INSERT INTO owner_drafts(id,owner_id,data_json,status,review_note,created_at,updated_at) SELECT id,created_by,?,'approved_public',?,?,? FROM venue_workspaces WHERE id=? AND operation_id=? ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,status='approved_public',review_note=excluded.review_note,updated_at=excluded.updated_at").bind(published,note,stamp,stamp,id,operation));
 const result=await db().batch(statements);if(!result[0].meta.changes)throw new AuthError(409,'This submission changed. Reload it.');
}
export async function inviteOwner(user:AuthUser,id:string,email:string,note:string){
 if(!isAdminUser(user))throw new AuthError(403,'Administrator access required.');
 await createWorkspace(user,id);
 const invite=crypto.randomUUID();await db().prepare('INSERT INTO venue_owner_invites(id,venue_id,email,created_by,verification_note,expires_at) VALUES(?,?,?,?,?,?)').bind(invite,id,email.trim().toLowerCase(),user.userId,note,Math.floor(Date.now()/1000)+7*86400).run();
 return {id:invite,path:'/owner',message:'Invite created for this Google account. Share the owner workspace link; no email has been sent.'};
}
export async function acceptInvite(user:AuthUser,id:string){
 const now=Math.floor(Date.now()/1000),database=db();
 const result=await database.batch([
  database.prepare('INSERT INTO venue_members(venue_id,user_id) SELECT venue_id,? FROM venue_owner_invites WHERE id=? AND email=? AND expires_at>? AND revoked=0 AND accepted_by IS NULL ON CONFLICT DO NOTHING').bind(user.userId,id,user.email,now),
  database.prepare('UPDATE venue_owner_invites SET accepted_by=? WHERE id=? AND email=? AND expires_at>? AND revoked=0 AND accepted_by IS NULL AND EXISTS(SELECT 1 FROM venue_members WHERE venue_id=venue_owner_invites.venue_id AND user_id=?)').bind(user.userId,id,user.email,now,user.userId)
 ]);if(!result[1].meta.changes)throw new AuthError(409,'This invitation expired or was already used.');
}
