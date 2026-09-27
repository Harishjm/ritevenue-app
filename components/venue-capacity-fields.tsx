'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {Users} from 'lucide-react';
import {MAX_VENUE_GUESTS,emptyCapacityDetails,type CapacityDetails} from '@/lib/venue-capacity';

type Value={capacity:number|null;capacityDetails?:CapacityDetails|null};
function GuestCountInput({label,count,onCount,required=false,minimum=1,maximum=MAX_VENUE_GUESTS}:{label:string;count:number|null;onCount:(count:number|null)=>void;required?:boolean;minimum?:number;maximum?:number}){
 const input=useRef<HTMLInputElement>(null);
 const invalid=count!==null&&(count<minimum||count>maximum);
 useEffect(()=>{
  input.current?.setCustomValidity(count!==null&&count<minimum?`Enter at least ${minimum.toLocaleString('en-IN')} guests.`:count!==null&&count>maximum?`Enter no more than ${maximum.toLocaleString('en-IN')} guests.`:'');
 },[count,minimum,maximum]);
 return <label>{label}<span className="venue-capacity-input"><input ref={input} type="text" inputMode="numeric" pattern="[0-9]+" maxLength={5} required={required} aria-invalid={invalid||undefined} value={count===null?'':String(count)} placeholder={required?'e.g. 1500':'e.g. 500'} onChange={e=>{const raw=e.target.value;if(/^\d*$/.test(raw))onCount(raw===''?null:Number(raw));}}/><span aria-hidden="true">guests</span></span></label>;
}
export default function VenueCapacityFields({value,onChange}:{value:Value;onChange:(next:Value)=>void}){
 const id=useId(),details=value.capacityDetails||emptyCapacityDetails();
 const [expanded,setExpanded]=useState(!!(details.seated||details.floating));
 const change=(key:keyof CapacityDetails,count:number|null)=>onChange({...value,capacityDetails:{...details,[key]:count}});
 const maximumMinimum=Math.max(1,details.minimum||1,details.seated||1,details.floating||1);
 function field(label:string,count:number|null,onCount:(n:number|null)=>void,required=false,minimum=1){
  return <GuestCountInput label={label} count={count} onCount={onCount} required={required} minimum={minimum} maximum={required?MAX_VENUE_GUESTS:value.capacity||MAX_VENUE_GUESTS}/>;
 }
 return <section className="venue-capacity-fields" aria-labelledby={id+'-title'}>
  <div className="venue-capacity-heading"><Users size={21} aria-hidden="true"/><h3 id={id+'-title'}>Guest capacity</h3></div>
  <p className="venue-capacity-help">Enter a maximum, or add a minimum to show a guest range.</p>
  <div className="venue-capacity-grid">
   {field('Minimum guests (optional)',details.minimum,count=>change('minimum',count))}
   {field('Maximum guests',value.capacity,count=>onChange({...value,capacity:count}),true,maximumMinimum)}
  </div>
  <details className="venue-capacity-layouts" open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}>
   <summary>Add seated & floating capacity <span>Optional</span></summary>
   <p>Seated is the number who can sit together. Floating is the total attending across the event, with guests arriving and leaving.</p>
   <div className="venue-capacity-grid">
    {field('Seated guests',details.seated,count=>change('seated',count))}
    {field('Floating guests',details.floating,count=>change('floating',count))}
   </div>
   <p className="venue-capacity-help">Set the maximum to cover the larger guest count. Do not add seated and floating counts together.</p>
  </details>
 </section>;
}
