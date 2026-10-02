'use client';

import {useId} from 'react';
import {MAX_VENUE_POLICIES_LENGTH} from '@/lib/venue-policies';

export default function VenuePoliciesEditor({value,onChange}:{value:string;onChange:(policies:string)=>void}){
 const id=useId();
 return <section className="custom-rental-editor venue-policies-editor" aria-labelledby={id+'-heading'}>
  <div><p className="eyebrow">OPTIONAL · PUBLIC LISTING</p><h3 id={id+'-heading'}>Policies & house rules</h3><p>Paste as many policy points as needed. You can include booking and cancellation terms, outside catering or décor rules, alcohol, music, pets, access times and deposits.</p></div>
  <label htmlFor={id}>Venue policies</label>
  <textarea id={id} rows={10} maxLength={MAX_VENUE_POLICIES_LENGTH} value={value}
   aria-describedby={id+'-help '+id+'-count'}
   placeholder={'Booking and cancellation policy\n\nOutside catering and décor rules\n\nMusic, alcohol and pet rules\n\nAccess times and deposits'}
   onChange={event=>onChange(event.target.value)}/>
  <div className="custom-rental-meta"><p id={id+'-help'}>Leave this blank if no policies were provided. Paragraphs and line breaks will appear on the public venue page after approval.</p><span id={id+'-count'}>{value.length.toLocaleString('en-IN')} / {MAX_VENUE_POLICIES_LENGTH.toLocaleString('en-IN')}</span></div>
  <details className="custom-rental-preview"><summary>Preview policies</summary><div className="custom-rental-copy">{value.trim()||'Your policies will appear here as you type.'}</div></details>
 </section>;
}
