'use client';

import {useId} from 'react';
import {Check,ClipboardList,FileText} from 'lucide-react';

export default function VenueDetailsMode({custom,onChange}:{custom:boolean;onChange:(custom:boolean)=>void}){
 const name=useId();
 const choices=[
  {value:false,title:'Standard packages',description:'Enter full-day, half-day and marriage rentals in guided price fields.',Icon:ClipboardList},
  {value:true,title:'Custom details',description:'Paste your own packages, hall combinations, facilities, prices and GST notes.',Icon:FileText},
 ];
 return <fieldset className="venue-details-mode">
  <legend>How would you like to add rental details?</legend>
  <p className="venue-details-mode-help">Choose the format that fits your venue.</p>
  <div className="venue-details-mode-options">
   {choices.map(({value,title,description,Icon})=><label key={title} className="venue-details-mode-card" data-selected={custom===value}>
    <input type="radio" name={name} value={value?'custom':'standard'} checked={custom===value} onChange={()=>onChange(value)}/>
    <span className="venue-details-mode-icon" aria-hidden="true"><Icon size={23}/></span>
    <span className="venue-details-mode-copy"><strong>{title}</strong><span>{description}</span></span>
    <span className="venue-details-mode-check" aria-hidden="true">{custom===value&&<Check size={14} strokeWidth={3}/>}</span>
   </label>)}
  </div>
 </fieldset>;
}
