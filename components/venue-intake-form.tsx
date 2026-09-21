'use client';
/* eslint-disable @next/next/no-img-element -- Local blob previews are already optimized in the browser. */
import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {optimizeVenuePhoto} from '@/lib/optimize-venue-photo';
import {MAX_VENUE_PHOTOS} from '@/lib/venue-photo';
type Photo={id:string;blob:Blob;url:string;description:string;originalBytes:number;width:number;height:number};
const size=(bytes:number)=>bytes>=1024*1024?(bytes/(1024*1024)).toFixed(1)+' MB':Math.ceil(bytes/1024)+' KB';
export default function VenueIntakeForm(){
 const [busy,setBusy]=useState(false),[optimizing,setOptimizing]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState(''),[photos,setPhotos]=useState<Photo[]>([]);
 const key=useRef(''),sending=useRef(false),processing=useRef(false),urls=useRef(new Set<string>());
 useEffect(()=>()=>{for(const url of urls.current)URL.revokeObjectURL(url);},[]);
 async function addPhotos(files:FileList|null){
  if(!files?.length||processing.current||sending.current)return;
  if(files.length+photos.length>MAX_VENUE_PHOTOS){setError('Choose up to six photos per application.');return;}
  processing.current=true;setOptimizing(true);setError('');
  try{for(const file of Array.from(files)){
   const result=await optimizeVenuePhoto(file),url=URL.createObjectURL(result.blob);urls.current.add(url);
   setPhotos(previous=>[...previous,{...result,id:crypto.randomUUID(),url,description:''}]);
  }}catch(e){setError(e instanceof Error?e.message:'Could not optimize this photo.');}
  finally{processing.current=false;setOptimizing(false);}
 }
 function removePhoto(photo:Photo){URL.revokeObjectURL(photo.url);urls.current.delete(photo.url);setPhotos(previous=>previous.filter(p=>p.id!==photo.id));}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(sending.current||processing.current)return;sending.current=true;setBusy(true);setError('');
  const form=new FormData(event.currentTarget);if(!key.current)key.current=crypto.randomUUID();
  const application={requestKey:key.current,venueName:form.get('venueName'),locality:form.get('locality'),contactName:form.get('contactName'),email:form.get('email'),phone:form.get('phone'),capacity:Number(form.get('capacity')),notes:form.get('notes'),consent:form.get('consent')==='on',website:form.get('website'),photoDescriptions:photos.map(photo=>photo.description),photoConsent:photos.length>0&&form.get('photoConsent')==='on'};
  const multipart=new FormData();multipart.append('application',JSON.stringify(application));
  photos.forEach((photo,index)=>multipart.append('photos',photo.blob,'venue-photo-'+(index+1)+'.webp'));
  try{
   const response=await fetch('/api/venue-applications',{method:'POST',...(photos.length?{body:multipart}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(application)})});
   const result=await response.json() as {error?:string;reference?:string};
   if(!response.ok){if(response.status===409)key.current='';throw new Error(result.error||'Please try again.');}
   if(!result.reference)throw new Error('Could not confirm your submission. Please retry.');
   setReference(result.reference);for(const url of urls.current)URL.revokeObjectURL(url);urls.current.clear();
  }catch(e){setError(e instanceof Error?e.message:'Connection interrupted. Keep this page open and retry.');}finally{setBusy(false);sending.current=false;}
 }
 if(reference)return <section className="intake-success" role="status"><h2>Your venue application is saved.</h2><p>The RiteVenue team can now review your details{photos.length?' and '+photos.length+(photos.length===1?' photo':' photos'):''} and contact you. Your venue and photographs are not public yet.</p><p>Next, we’ll confirm your packages and permission to publish. No account has been created by this form.</p><p className="intake-reference">Reference: {reference}</p><Link className="primary" href="/">Back to RiteVenue</Link></section>;
 return <form className="intake-form" onSubmit={submit}>
  <fieldset disabled={busy||optimizing}><legend>Tell us about your venue</legend><div className="intake-fields">
   <label>Venue name<input name="venueName" required minLength={3} maxLength={120} autoComplete="organization"/></label>
   <label>Bengaluru locality<input name="locality" required minLength={2} maxLength={120} placeholder="e.g. Rajajinagar"/></label>
   <label>Your name<input name="contactName" required minLength={2} maxLength={100} autoComplete="name"/></label>
   <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>
   <label>Contact number<input name="phone" type="tel" required minLength={8} maxLength={24} autoComplete="tel"/></label>
   <label>Guest capacity<input name="capacity" type="number" min={1} max={50000} required inputMode="numeric"/></label>
   <label className="intake-wide">Anything else? <span className="muted">Optional</span><textarea name="notes" rows={4} maxLength={2000} placeholder="Tell us about your halls, lawn, packages or preferred contact time."/></label>
  </div>
  <section className="intake-photo-section" aria-labelledby="venue-photo-heading"><h2 id="venue-photo-heading">Venue photographs <span className="muted">Optional</span></h2><p>Show your hall, entrance, dining area or outdoor spaces. We’ll resize and compress your photos automatically before uploading.</p>
   <label className="intake-photo-picker">Add venue photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy||optimizing||photos.length>=MAX_VENUE_PHOTOS} aria-describedby="venue-photo-help" onChange={e=>{void addPhotos(e.target.files);e.target.value='';}}/></label>
   <p id="venue-photo-help" className="muted">Up to 6 JPEG, PNG or WebP photos, 15 MB each before compression. We save WebP images up to 1600 pixels and 350 KB each. Original files are not uploaded. Export HEIC photos as JPEG first.</p>
   <div className="intake-photo-grid">{photos.map((photo,index)=><div className="intake-photo-card" key={photo.id}>
    <img src={photo.url} alt={photo.description||'Selected venue photo '+(index+1)} width={photo.width} height={photo.height}/>
    <p className="muted">{size(photo.originalBytes)} → {size(photo.blob.size)} · {photo.width} × {photo.height}</p>
    <label>Describe photo {index+1}<input required minLength={3} maxLength={160} value={photo.description} placeholder="e.g. Main hall with wedding stage" onChange={e=>setPhotos(previous=>previous.map(p=>p.id===photo.id?{...p,description:e.target.value}:p))}/></label>
    <button className="filter-button" type="button" aria-label={'Remove photo '+(index+1)} onClick={()=>removePhoto(photo)}>Remove photo</button>
   </div>)}</div>
   {photos.length>0&&<label className="intake-consent"><input type="checkbox" name="photoConsent" required/><span>I own these photographs or have permission to provide them to RiteVenue for review. I understand that public display requires separate permission and approval.</span></label>}
  </section>
  <div className="intake-trap" aria-hidden="true"><label>Leave empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
  <label className="intake-consent"><input type="checkbox" name="consent" required/><span>I am authorised to represent this venue and agree that RiteVenue may contact me about onboarding. I have read the <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy information</a>.</span></label>
  <p className="muted">Your contact details and photos stay private until review. A listing is published only after your separate permission and administrator approval.</p>
  <button className="primary" type="submit">{busy?'Saving your application and photos…':optimizing?'Optimizing photos…':'Submit venue for review'}</button></fieldset>
  {optimizing&&<p role="status">Optimizing your photos… Larger files may take a moment.</p>}
  {error&&<p className="intake-error" role="alert">{error}</p>}
 </form>;
}
