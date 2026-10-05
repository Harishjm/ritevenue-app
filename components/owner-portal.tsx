'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {newWorkingVenue,ownerStatusLabels,workingVenueSchema,type WorkingVenue} from '@/lib/owner-portal-domain';
import {venueTypes} from '@/lib/venues';
import {venuePublicPath} from '@/lib/venue-url';
import VenueCapacityFields from './venue-capacity-fields';
import VenueDetailsMode from './venue-details-mode';
import RentalOfferEditor from './rental-offer-editor';
import RentalOfferSummary from './rental-offer-summary';
import VenuePoliciesEditor from './venue-policies-editor';
import VenuePoliciesSummary from './venue-policies-summary';
import CustomCateringEditor from './custom-catering-editor';
import PricingFields from './standard-rental-fields';
import StandardRentalSummary from './standard-rental-summary';
import {pricingForAvailability} from '@/lib/standard-rentals';
import {PublicationFields} from './publication-fields';
import VenuePhotoPicker from './venue-photo-picker';
import {optimizeVenuePhoto} from '@/lib/optimize-venue-photo';
import {OWNER_START_KEY} from './owner-start';
import AuthSignOut from './auth-sign-out';

type Venue={id:string;data:WorkingVenue;revision:number;status:string;published?:boolean;reviewNote?:string;history?:{revision:number;decision:string;note:string;created_at:string}[]};
type Dashboard={venues:Venue[];invites:{id:string;venue_id:string;name:string}[];email:string;admin:boolean};
type Upload={id:string;file:File;state:'waiting'|'uploading'|'done'|'error';error?:string};
class PortalError extends Error{constructor(message:string,public status:number){super(message);}}
async function api<T>(body?:unknown):Promise<T>{
 const response=await fetch('/api/owner',{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await response.json() as T&{error?:string};if(!response.ok)throw new PortalError(data.error||'Request failed.',response.status);return data;
}
export default function OwnerPortal({initialVenue,resume=false}:{initialVenue?:string;resume?:boolean}){
 const [dashboard,setDashboard]=useState<Dashboard|null>(null),[editor,setEditor]=useState<Venue|null>(null),[step,setStep]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[saveState,setSaveState]=useState('Saved'),[conflict,setConflict]=useState(false),[uploads,setUploads]=useState<Upload[]>([]),[uploading,setUploading]=useState(false),[reviewNote,setReviewNote]=useState(''),[inviteEmail,setInviteEmail]=useState(''),[inviteNote,setInviteNote]=useState('');
 const current=useRef(editor),saved=useRef(''),inFlight=useRef<Promise<void>|null>(null),started=useRef(false),editorElement=useRef<HTMLDivElement>(null),uploadLock=useRef(false),customDetails=useRef<WorkingVenue['rentalDetails']>(null);
 current.current=editor;
 const reload=useCallback(async()=>{const data=await api<Dashboard>();setDashboard(data);return data;},[]);
 function choose(row:Venue,admin:boolean){
  let data=workingVenueSchema.parse(row.data);
  if(!admin&&data.publication.source==='admin')data={...data,publication:{...data.publication,source:'owner',consent:false,authorizationNote:'',calendar:null,calendarUpdatedAt:null}};
  customDetails.current=data.rentalDetails;saved.current=JSON.stringify(row.data);setEditor({...row,data});setConflict(false);setError('');setNotice('');setStep(row.status==='pending_review'?2:0);setUploads([]);setReviewNote('');
  requestAnimationFrame(()=>editorElement.current?.scrollIntoView({behavior:'smooth',block:'start'}));
 }
 useEffect(()=>{
  if(started.current)return;started.current=true;
  void (async()=>{
   const list=await reload();
   if(initialVenue){const row=await api<Venue>({action:'open',id:initialVenue});const updated=await reload();choose({...updated.venues.find(v=>v.id===initialVenue),...row},updated.admin);}
   else if(resume){
    const raw=sessionStorage.getItem(OWNER_START_KEY);if(!raw)return;
    const start=JSON.parse(raw),row=await api<Venue>({action:'open',id:start.id});
    // A repeated callback must never overwrite an already completed draft.
    if(row.revision===1&&!row.data.name){const data={...newWorkingVenue(),name:String(start.name||'').slice(0,100),city:String(start.city||'Bengaluru').slice(0,100),locality:String(start.locality||'').slice(0,100)};const result=await api<{revision:number;status:string}>({action:'save',id:row.id,revision:row.revision,data,submit:false});choose({...row,...result,data},list.admin);}else choose(row,list.admin);
    sessionStorage.removeItem(OWNER_START_KEY);await reload();
   }
  })().catch(e=>setError(e.message));
 },[initialVenue,resume,reload]);
 async function persist(submit=false):Promise<void>{
  if(inFlight.current){await inFlight.current;return persist(submit);}
  const row=current.current;if(!row||row.status==='pending_review')return;if(conflict)throw new Error('Reload the saved version before continuing.');
  const serialized=JSON.stringify(row.data);if(!submit&&serialized===saved.current)return;
  setSaveState('Saving…');
  const job=(async()=>{
   try{const result=await api<{revision:number;status:string}>({action:'save',id:row.id,revision:row.revision,data:row.data,submit});saved.current=serialized;const latest=current.current;if(latest?.id===row.id){current.current={...latest,...result};setEditor(current.current);}setSaveState('Saved');if(submit){setNotice('Submitted for review. Your existing public listing stays visible while these changes are reviewed.');await reload();}}
   catch(e){setSaveState('Not saved');setError((e as Error).message);if(e instanceof PortalError&&e.status===409)setConflict(true);throw e;}
  })();inFlight.current=job;try{await job;}finally{inFlight.current=null;}
 }
 useEffect(()=>{if(!editor||conflict||editor.status==='pending_review')return;if(JSON.stringify(editor.data)===saved.current)return;setSaveState('Unsaved changes');const timer=setTimeout(()=>{void persist().catch(()=>{});},900);return()=>clearTimeout(timer);},[editor?.data,editor?.revision,conflict]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(current.current&&JSON.stringify(current.current.data)!==saved.current||uploadLock.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 function change(value:Partial<WorkingVenue>){setEditor(row=>row?{...row,data:{...row.data,...value}}:row);}
 async function action(body:{action:string;id:string;revision?:number;decision?:string;note?:string}){setBusy(true);setError('');try{await persist();if(body.revision!==undefined&&current.current?.id===body.id)body={...body,revision:current.current.revision};await api(body);const list=await reload();if(current.current){const updated=list.venues.find(v=>v.id===current.current?.id);if(updated)choose(updated,list.admin);}}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function open(row?:Venue){
  if(uploadLock.current)return;setBusy(true);try{await persist();if(conflict)return;const next=await api<Venue>({action:'open',id:row?.id||crypto.randomUUID()});const list=await reload();choose({...list.venues.find(v=>v.id===next.id),...next},list.admin);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function uploadPhoto(item:Upload,venueId:string){
  setUploads(list=>list.map(photo=>photo.id===item.id?{...photo,state:'uploading',error:undefined}:photo));
  try{
   const optimized=await optimizeVenuePhoto(item.file),response=await fetch(`/api/owner/photos?venue=${venueId}&photo=${item.id}`,{method:'POST',headers:{'Content-Type':'image/webp'},body:optimized.blob});
   const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Upload failed.');
   setEditor(row=>row?.id===venueId?{...row,data:{...row.data,images:Array.from(new Set([...row.data.images,item.id]))}}:row);
   setUploads(list=>list.map(photo=>photo.id===item.id?{...photo,state:'done'}:photo));
  }catch(e){setUploads(list=>list.map(photo=>photo.id===item.id?{...photo,state:'error',error:(e as Error).message}:photo));}
 }
 async function uploadFiles(files:File[],retry?:Upload){
  if(!editor||uploadLock.current)return;
  const pending=uploads.filter(p=>p.state!=='done').length;
  if(!retry&&editor.data.images.length+pending+files.length>15){setError('Choose at most 15 photos, including uploads awaiting retry.');return;}
  const items=retry?[retry]:files.map(file=>({id:crypto.randomUUID(),file,state:'waiting' as const}));
  if(!retry)setUploads(list=>[...list,...items]);uploadLock.current=true;setUploading(true);
  try{for(const item of items)await uploadPhoto(item,editor.id);}finally{uploadLock.current=false;setUploading(false);}
 }
 const data=editor?.data,locked=busy||uploading||editor?.status==='pending_review',admin=dashboard?.admin||false;
 return <div className="owner-portal">
  <div className="workspace-actions"><button className="primary" disabled={busy||uploading||conflict} onClick={()=>void open()}>Add a venue</button><a className="filter-button" href="/owner">My venues</a>{admin&&<a className="filter-button" href="/admin">Admin workspace</a>}<AuthSignOut/></div>
  {dashboard&&<p className="muted">Signed in as {dashboard.email}</p>}
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
  {!dashboard&&!error&&<p role="status">Loading your venues…</p>}
  {dashboard?.invites.map(invite=><div className="notice" key={invite.id}><strong>You’re invited to manage {invite.name||'a venue'}.</strong><button className="filter-button" disabled={busy} onClick={()=>void action({action:'accept',id:invite.id})}>Accept invitation</button></div>)}
  {editor&&data&&<div className="portal-editor" ref={editorElement}>
   <div className="portal-editor-heading"><div><p className="eyebrow">{ownerStatusLabels[editor.status]}{editor.published?' · Current listing remains live':''}</p><h2>{data.name||'Your new venue'}</h2></div><span role="status">{saveState}</span></div>
   {editor.reviewNote&&<aside className="notice"><strong>Review team feedback</strong><p>{editor.reviewNote}</p></aside>}
   {conflict&&<button className="filter-button" onClick={()=>{if(window.confirm('Discard unsaved changes and reload the saved version?'))void reload().then(list=>{const row=list.venues.find(v=>v.id===editor.id);if(row)choose(row,list.admin);});}}>Reload saved version</button>}
   <nav className="portal-steps" aria-label="Venue form steps">{['Venue basics','Photos & details','Preview & submit'].map((label,index)=><button type="button" key={label} aria-current={step===index?'step':undefined} onClick={()=>setStep(index)}>{index+1}. {label}</button>)}</nav>
   <form onSubmit={e=>{e.preventDefault();setBusy(true);void persist(true).catch(()=>{}).finally(()=>setBusy(false));}}>
    <fieldset disabled={locked||conflict} className="portal-fields stack-form">
     {step===0&&<>
      <div className="form-grid"><label>Venue name<input maxLength={100} value={data.name} onChange={e=>change({name:e.target.value})}/></label><label>Venue type<select value={data.type} onChange={e=>change({type:e.target.value})}>{venueTypes.slice(1).map(type=><option key={type}>{type}</option>)}</select></label><label>City<input maxLength={100} value={data.city} onChange={e=>change({city:e.target.value})}/></label><label>Locality<input maxLength={100} value={data.locality} onChange={e=>change({locality:e.target.value})}/></label></div>
      <label>Full address<textarea maxLength={400} value={data.address} onChange={e=>change({address:e.target.value})}/></label>
      <VenueCapacityFields key={editor.id} value={data} onChange={value=>change({capacity:value.capacity,capacityDetails:value.capacityDetails||null})}/>
      <div className="form-grid"><label>Contact name<input maxLength={100} value={data.contactName} onChange={e=>change({contactName:e.target.value})}/></label><label>Contact phone<input type="tel" maxLength={30} value={data.phone} onChange={e=>change({phone:e.target.value})}/></label></div><p className="muted">Contact details are for the review team and are not shown on your public listing.</p>
     </>}
     {step===1&&<>
      <label>About your venue<textarea rows={5} maxLength={3000} value={data.description} onChange={e=>change({description:e.target.value})} placeholder="Describe the venue and facilities in at least 40 characters."/></label>
      <VenueDetailsMode custom={!!data.rentalDetails} onChange={custom=>{if(data.rentalDetails)customDetails.current=data.rentalDetails;change({rentalDetails:custom?customDetails.current||{version:2,text:''}:null});}}/>
      {data.rentalDetails?<RentalOfferEditor value={data.rentalDetails} onChange={rentalDetails=>change({rentalDetails})}/>:<PricingFields value={data.pricing} availability={data.packageAvailability} onChange={pricing=>change({pricing})} onAvailabilityChange={packageAvailability=>change({packageAvailability,pricing:pricingForAvailability(data.pricing,packageAvailability)})} timings={data.packageTimings} onTimingsChange={packageTimings=>change({packageTimings})}/>}
      <CustomCateringEditor value={data.cateringPolicy} allowMainCustomDetails={!!data.rentalDetails} onChange={cateringPolicy=>change({cateringPolicy})}/>
      <VenuePoliciesEditor value={data.policies} onChange={policies=>change({policies})}/>
      <label className="portal-check"><input type="checkbox" checked={data.rightsConfirmed} onChange={e=>change({rightsConfirmed:e.target.checked})}/>I am authorized to provide this venue’s details and photographs.</label>
      <VenuePhotoPicker count={data.images.length} busy={uploading} disabled={!data.rightsConfirmed} completed={uploads.filter(p=>p.state==='done').length} total={uploads.length} onFiles={files=>void uploadFiles(files)}/>
      <div className="draft-photos">{data.images.map((id,index)=><div key={id}><img src={'/api/owner/photos?photo='+id} width={150} height={110} alt={`${data.name} — photo ${index+1}`}/>{index===0?<span className="draft-cover-label">Cover photo</span>:<button type="button" className="draft-cover-button" onClick={()=>change({images:[id,...data.images.filter(photo=>photo!==id)]})}>Set as cover</button>}<button type="button" className="filter-button" aria-label={`Remove photo ${index+1}`} onClick={()=>change({images:data.images.filter(photo=>photo!==id)})}>Remove</button></div>)}</div>
      {uploads.filter(p=>p.state!=='done').map(photo=><div className="portal-upload" key={photo.id}><span>{photo.file.name} — {photo.error||photo.state}</span>{photo.state==='error'&&<><button type="button" disabled={uploading} onClick={()=>void uploadFiles([],photo)}>Retry upload</button><button type="button" disabled={uploading} onClick={()=>setUploads(list=>list.filter(p=>p.id!==photo.id))}>Dismiss</button></>}</div>)}
     </>}
     {step===2&&<>
      <div className="portal-preview"><h3>{data.name||'Venue name'}</h3><p>{data.address||'Add the venue address'}</p><p>{data.capacity?`Up to ${data.capacity.toLocaleString('en-IN')} guests`:'Add guest capacity'}</p><p className="prose">{data.description||'Add a venue description'}</p>{data.images[0]&&<img src={'/api/owner/photos?photo='+data.images[0]} alt="Selected venue cover" width={600} height={360}/>}<p>{data.images.length} photos added · minimum 2, maximum 15</p>{data.rentalDetails?<RentalOfferSummary value={data.rentalDetails}/>:<StandardRentalSummary pricing={data.pricing} availability={data.packageAvailability} timings={data.packageTimings}/>}<VenuePoliciesSummary value={data.policies}/></div>
      <PublicationFields key={editor.id} value={data.publication} admin={admin} preservePublished onChange={publication=>change({publication})}/>
      <p className="muted">You can return to correct any details. Publishing requires administrator approval.</p>
      <button className="primary" type="submit" disabled={uploads.some(p=>p.state!=='done')}>Submit for review</button>
     </>}
    </fieldset>
   </form>
   <div className="workspace-actions">{step>0&&<button className="filter-button" onClick={()=>setStep(step-1)}>Back</button>}{step<2&&<button className="primary" onClick={()=>setStep(step+1)}>Continue</button>}{editor.status!=='pending_review'&&<button className="filter-button" disabled={busy||uploading||conflict} onClick={()=>void persist().catch(()=>{})}>Save draft</button>}{editor.status==='pending_review'&&<button className="filter-button" disabled={busy} onClick={()=>void action({action:'withdraw',id:editor.id,revision:editor.revision})}>Withdraw submission & edit</button>}</div>
   {!admin&&editor.published&&<button className="filter-button" disabled={busy||uploading||conflict} onClick={()=>{if(window.confirm('Withdraw public-display permission and remove this venue from the public directory?'))void action({action:'withdraw_publication',id:editor.id,revision:editor.revision});}}>Withdraw public-display permission</button>}
   {admin&&<div className="portal-admin stack-form">
    {editor.status==='pending_review'&&<><h3>Review this submitted version</h3><p>Contact: {data.contactName} · {data.phone}</p><label>Feedback for the owner<textarea maxLength={1000} value={reviewNote} onChange={e=>setReviewNote(e.target.value)}/></label><div className="workspace-actions">{(['published','changes_requested','rejected'] as const).map(decision=><button key={decision} className={decision==='published'?'primary':'filter-button'} disabled={busy||reviewNote.trim().length<5} onClick={()=>void action({action:'review',id:editor.id,revision:editor.revision,decision,note:reviewNote})}>{decision==='published'?'Approve & publish':decision==='changes_requested'?'Request changes':'Reject'}</button>)}</div></>}
    <h3>Assign an owner</h3><label>Owner’s Google account email<input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/></label><label>How did you confirm this person manages the venue?<textarea maxLength={1000} value={inviteNote} onChange={e=>setInviteNote(e.target.value)}/></label><button className="filter-button" disabled={busy||inviteNote.trim().length<10||!inviteEmail.includes('@')} onClick={()=>{setBusy(true);void api<{message:string}>({action:'invite',id:editor.id,email:inviteEmail,note:inviteNote}).then(result=>setNotice(result.message)).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Create owner invitation</button>
    <p className="muted">Share the owner workspace link below through WhatsApp. The invitation is valid for seven days and requires the assigned Google account. No automated email is sent.</p><a href="/owner">Owner workspace link</a><button className="filter-button" onClick={()=>{void navigator.clipboard.writeText(window.location.origin+'/owner').then(()=>setNotice('Owner workspace link copied.')).catch(()=>setError('Copy the owner workspace link shown above.'));}}>Copy owner link</button>
    {editor.published&&<button className="filter-button" disabled={busy} onClick={()=>{if(window.confirm('Remove this venue from the public directory?'))void action({action:'unpublish',id:editor.id,revision:editor.revision});}}>Unpublish listing</button>}
   </div>}
   {!!editor.history?.length&&<details><summary>Submission and review history</summary>{editor.history.map((event,index)=><p key={index}><strong>{event.decision.replaceAll('_',' ')}</strong> · {new Date(event.created_at).toLocaleDateString()}<br/>{event.note}</p>)}</details>}
  </div>}
  <section className="portal-venue-list"><h2>{admin?'Venue submissions & owner access':'My venues'}</h2>{dashboard&&!dashboard.venues.length&&<p>No venues yet. Start your first draft above.</p>}{dashboard?.venues.map(row=><article key={row.id} className="portal-venue-card">{row.data.images[0]&&<img src={'/api/owner/photos?photo='+row.data.images[0]} alt={row.data.name+' cover'} width={160} height={110}/>}<div><p className="tag">{ownerStatusLabels[row.status]}{row.published?' · Live listing':''}</p><h3>{row.data.name||'Untitled venue'}</h3><p>{row.data.locality}, {row.data.city}</p>{row.reviewNote&&<p>{row.reviewNote}</p>}<button className="primary" disabled={busy||uploading||conflict} onClick={()=>void open(row)}>{row.status==='pending_review'?'View submission':row.status==='changes_requested'?'Fix requested changes':'Continue editing'}</button>{row.published&&<a className="filter-button" href={venuePublicPath({...row.data,id:row.id})}>View public listing</a>}</div></article>)}</section>
 </div>;
}
