'use client';

import {useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {ArrowRight,CheckCircle2} from 'lucide-react';
import {budgetOptions,foodOptions,helpOptions,plannerOptions,weddingEnquirySchema} from '@/lib/wedding-enquiries';

function Options({items}:{items:Record<string,string>}){return <>{Object.entries(items).map(([value,label])=><option value={value} key={value}>{label}</option>)}</>;}

export default function WeddingEnquiryForm({today}:{today:string}){
 const [datePreference,setDatePreference]=useState('flexible');
 const [chooseLocation,setChooseLocation]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState('');
 const [contactMethod,setContactMethod]=useState('phone');
 const attempt=useRef<{payload:string;key:string}|null>(null),sending=useRef(false),success=useRef<HTMLDivElement>(null);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(sending.current)return;
  const form=event.currentTarget,fields=new FormData(form),text=(name:string)=>String(fields.get(name)||'');
  const params=new URLSearchParams(window.location.search);
  const tracking=(key:string)=>{const value=params.get(key)||'';return /^[a-zA-Z0-9 _.-]{0,100}$/.test(value)?value:'';};
  const data={location:chooseLocation?'Help me choose':text('location'),datePreference,eventDate:datePreference==='exact'?text('eventDate'):'',eventMonth:datePreference==='month'?text('eventMonth'):'',guests:Number(text('guests')),food:text('food'),help:text('help'),planner:text('planner'),budget:text('budget'),budgetScope:text('budgetScope'),name:text('name'),phone:text('phone'),email:text('email').trim(),contactMethod,notes:text('notes'),consent:fields.get('consent')==='on',website:text('website'),source:tracking('utm_source'),medium:tracking('utm_medium'),campaign:tracking('utm_campaign')};
  const payload=JSON.stringify(data);
  if(attempt.current?.payload!==payload)attempt.current={payload,key:crypto.randomUUID()};
  const parsed=weddingEnquirySchema.safeParse({...data,requestKey:attempt.current.key});
  if(!parsed.success){setError(parsed.error.issues[0].message);const field=form.elements.namedItem(String(parsed.error.issues[0].path[0]));if(field instanceof HTMLElement)field.focus();return;}
  sending.current=true;setBusy(true);setError('');
  try{
   const response=await fetch('/api/wedding-enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data)});
   const result=await response.json() as {reference?:string;error?:string};
   if(!response.ok||!result.reference){if(response.status===409)attempt.current=null;throw new Error(result.error||'Your enquiry could not be saved. Please try again.');}
   setReference(result.reference);requestAnimationFrame(()=>{success.current?.focus();success.current?.scrollIntoView({block:'center',behavior:'smooth'});});
  }catch(e){setError(e instanceof Error?e.message:'We could not save your enquiry. Please retry.');}
  finally{sending.current=false;setBusy(false);}
 }

 if(reference)return <div className="wedding-success" ref={success} tabIndex={-1} role="status">
  <CheckCircle2 size={40} aria-hidden="true"/><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>We’ve received your wedding enquiry.</h2>
  <p>Our team will review your preferences and contact you by {contactMethod==='whatsapp'?'WhatsApp':'phone'} to discuss the next steps.</p>
  <p className="enquiry-reference">Your enquiry reference<br/><strong>{reference}</strong></p>
  <p className="muted">Keep this reference for follow-up. No venue or service has been booked, and no payment is due. Availability and prices will be confirmed with you before any booking.</p>
  <Link href="/guides" className="primary">Explore wedding planning guides <ArrowRight size={17}/></Link>
 </div>;

 return <form className="wedding-form" onSubmit={submit} aria-busy={busy}>
  <fieldset disabled={busy}>
   <legend><span>01</span> Your celebration</legend>
   <div className="wedding-fields">
    <div className="wedding-wide"><label htmlFor="w-location">Where in Bengaluru are you looking?</label><input id="w-location" name="location" placeholder="e.g. Jayanagar, JP Nagar or South Bengaluru" required={!chooseLocation} disabled={chooseLocation} minLength={2} maxLength={200}/><label className="wedding-check"><input type="checkbox" checked={chooseLocation} onChange={e=>setChooseLocation(e.target.checked)}/>Help me choose a location</label></div>
    <label>Wedding date<select name="datePreference" value={datePreference} onChange={e=>setDatePreference(e.target.value)}><option value="flexible">Dates are flexible / not decided</option><option value="exact">I have a date</option><option value="month">I know the month</option></select></label>
    {datePreference==='exact'?<label>Preferred date<input name="eventDate" type="date" min={today} max={`${Number(today.slice(0,4))+5}-12-31`} required/></label>:datePreference==='month'?<label>Preferred month<input name="eventMonth" type="month" min={today.slice(0,7)} max={`${Number(today.slice(0,4))+5}-12`} required/></label>:<p className="wedding-hint">Still finding the right date? We can start with your preferences.</p>}
    <label>Approximate guest count<input name="guests" type="number" inputMode="numeric" min={1} max={50000} required placeholder="e.g. 250"/></label>
    <label>Food preference<select name="food" defaultValue="" required><option value="" disabled>Choose a preference</option><Options items={foodOptions}/></select></label>
   </div>
  </fieldset>
  <fieldset disabled={busy}>
   <legend><span>02</span> A little help, or the whole plan</legend>
   <div className="wedding-fields">
    <label>What would you like help with?<select name="help" defaultValue="" required><option value="" disabled>Choose the help you need</option><Options items={helpOptions}/></select></label>
    <label>Would you like an event planner?<select name="planner" defaultValue="" required><option value="" disabled>Choose an option</option><Options items={plannerOptions}/></select></label>
    <label>Estimated budget<select name="budget" defaultValue="undecided"><Options items={budgetOptions}/></select></label>
    <label>This budget is for<select name="budgetScope" defaultValue="whole_wedding"><option value="whole_wedding">The whole wedding</option><option value="venue">The venue only</option></select></label>
    <label className="wedding-wide">Anything else we should know? <span className="field-optional">Optional</span><textarea name="notes" maxLength={2000} rows={3} placeholder="Other functions, accommodation, accessibility needs or something you have in mind. Please avoid sensitive personal details."/></label>
   </div>
  </fieldset>
  <fieldset disabled={busy}>
   <legend><span>03</span> Let’s get in touch</legend>
   <div className="wedding-fields">
    <label>Your name<input name="name" autoComplete="name" minLength={2} maxLength={100} required placeholder="How should we address you?"/></label>
    <label>Mobile number<input name="phone" type="tel" autoComplete="tel" minLength={8} maxLength={24} required placeholder="e.g. +91 98765 43210"/></label>
    <label>Email <span className="field-optional">Optional</span><input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com"/></label>
    <label>Contact me by<select name="contactMethod" value={contactMethod} onChange={e=>setContactMethod(e.target.value)}><option value="phone">Phone call</option><option value="whatsapp">WhatsApp</option></select></label>
   </div>
   <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" maxLength={200}/></label>
   <label className="wedding-check wedding-consent"><input type="checkbox" name="consent" required/><span>I agree that RiteVenue may contact me by {contactMethod==='whatsapp'?'WhatsApp':'phone'} about this enquiry. I have read the <Link href="/privacy#wedding-enquiries">privacy information</Link>. This does not sign me up for promotional messages.</span></label>
  </fieldset>
  {error&&<p className="error" role="alert">{error}</p>}
  <button className="primary wedding-submit" disabled={busy}>{busy?'Sending your enquiry…':'Request wedding assistance'}<ArrowRight size={18} aria-hidden="true"/></button>
  <p className="wedding-disclaimer">This is an enquiry, not a confirmed booking. We’ll discuss availability, services and prices with you before you decide.</p>
 </form>;
}
