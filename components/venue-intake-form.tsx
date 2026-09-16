'use client';
import {useRef,useState,type FormEvent} from 'react';
export default function VenueIntakeForm(){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState('');
 const key=useRef(''),sending=useRef(false);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);setError('');
  const form=new FormData(event.currentTarget);if(!key.current)key.current=crypto.randomUUID();
  try{const response=await fetch('/api/venue-applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestKey:key.current,venueName:form.get('venueName'),locality:form.get('locality'),contactName:form.get('contactName'),email:form.get('email'),phone:form.get('phone'),capacity:Number(form.get('capacity')),notes:form.get('notes'),consent:form.get('consent')==='on',website:form.get('website')})});
   const result=await response.json() as {error?:string;reference?:string};if(!response.ok){if(response.status===409)key.current='';throw new Error(result.error||'Please try again.');}if(!result.reference)throw new Error('Could not confirm your submission. Please retry.');setReference(result.reference);
  }catch(e){setError(e instanceof Error?e.message:'Connection interrupted. Please retry.');}finally{setBusy(false);sending.current=false;}
 }
 if(reference)return <section className="intake-success" role="status"><h2>Your venue application is saved.</h2><p>The RiteVenue team can now review it and contact you using the details you provided. Your venue is not public yet.</p><p>Next, we’ll arrange your photographs, packages and permission to publish. No account has been created by this form.</p><p className="intake-reference">Reference: {reference}</p><a className="primary" href="/">Back to RiteVenue</a></section>;
 return <form className="intake-form" onSubmit={submit}>
  <fieldset disabled={busy}><legend>Tell us about your venue</legend><div className="intake-fields">
   <label>Venue name<input name="venueName" required minLength={3} maxLength={120} autoComplete="organization"/></label>
   <label>Bengaluru locality<input name="locality" required minLength={2} maxLength={120} placeholder="e.g. Rajajinagar"/></label>
   <label>Your name<input name="contactName" required minLength={2} maxLength={100} autoComplete="name"/></label>
   <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>
   <label>Contact number<input name="phone" type="tel" required minLength={8} maxLength={24} autoComplete="tel"/></label>
   <label>Guest capacity<input name="capacity" type="number" min={1} max={50000} required inputMode="numeric"/></label>
   <label className="intake-wide">Anything else? <span className="muted">Optional</span><textarea name="notes" rows={4} maxLength={2000} placeholder="Tell us about your halls, lawn, packages or preferred contact time."/></label>
  </div><div className="intake-trap" aria-hidden="true"><label>Leave empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
  <label className="intake-consent"><input type="checkbox" name="consent" required/><span>I am authorised to represent this venue and agree that RiteVenue may contact me about onboarding. I have read the <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy information</a>.</span></label>
  <p className="muted">Your contact details stay private. Publication needs a separate review and your permission. Photos can be arranged after the team reviews your application.</p>
  {error&&<p className="intake-error" role="alert">{error}</p>}
  <button className="primary" type="submit">{busy?'Saving your application…':'Submit venue for review'}</button></fieldset>
 </form>;
}
