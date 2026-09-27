'use client';

import {useId} from 'react';
import {CUSTOM_DETAILS_MAX_LENGTH,rentalDetailsText,type RentalDetails} from '@/lib/venue-offers';

export default function RentalOfferEditor({value,onChange}:{value:RentalDetails;onChange:(d:RentalDetails)=>void}){
 const id=useId(),text=rentalDetailsText(value);
 return <section className="custom-rental-editor" aria-labelledby={id+'-heading'}>
  <div><p className="eyebrow">CUSTOM ADDITION</p><h3 id={id+'-heading'}>Your venue, in your own words</h3><p>Paste the details from your brochure, email or WhatsApp. Include hall combinations, rental timings, facilities, menu prices, GST and any extra charges.</p></div>
  {value.version===1&&<p className="custom-rental-note">Your existing offers are shown below as text. Editing this box will save them in the new text format. Review the details before saving.</p>}
  <label htmlFor={id}>Custom venue details</label>
  <textarea id={id} required maxLength={CUSTOM_DETAILS_MAX_LENGTH} rows={14} value={text}
   aria-describedby={id+'-help '+id+'-count'}
   placeholder={'Hall / lawn combinations and rental prices\n\nTimings and duration\n\nFacilities and what is included\n\nVeg / non-veg menus and per-person prices\n\nGST, cleaning and other charges'}
   onChange={e=>onChange({version:2,text:e.target.value})}/>
  <div className="custom-rental-meta"><p id={id+'-help'}>Paragraphs and line breaks will appear on the published listing. Include only details intended for public display.</p><span id={id+'-count'}>{text.length.toLocaleString('en-IN')} / {CUSTOM_DETAILS_MAX_LENGTH.toLocaleString('en-IN')}</span></div>
  {text.length>CUSTOM_DETAILS_MAX_LENGTH&&<p role="alert" className="error">These existing details exceed the text limit. Shorten them before saving as custom text; the saved original is unchanged until you save.</p>}
  <details className="custom-rental-preview"><summary>Preview listing text</summary><div className="custom-rental-copy">{text.trim()||'Your venue details will appear here as you type.'}</div></details>
 </section>;
}
