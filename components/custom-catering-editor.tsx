'use client';

import {policyLabels,type CateringPolicy} from '@/lib/catering';

export default function CustomCateringEditor({value,onChange,allowMainCustomDetails=true}:{value:CateringPolicy;onChange:(value:CateringPolicy)=>void;allowMainCustomDetails?:boolean}){
 const source=!allowMainCustomDetails&&value.customDetailsSource==='main_custom'?'':value.customDetailsSource??(value.notes||value.mode!=='unconfirmed'?'separate':'');
 const setSource=(next:CateringPolicy['customDetailsSource'])=>onChange(next==='separate'?{...value,customDetailsSource:next}:{...value,customDetailsSource:next,mode:'unconfirmed',supplierIds:[],notes:'',venueFee:0,minimumFoodSpend:0});
 return <section className="custom-rental-editor">
  <h3>Catering details <span className="muted">Optional</span></h3>
  <p>Choose what you know today. You can update catering information later.</p>
  <label>Where are the catering details?<select value={source} onChange={e=>setSource(e.target.value as CateringPolicy['customDetailsSource'])}>
   <option value="">Choose an option</option>
   <option value="not_provided">I don’t have catering details yet</option>
   {allowMainCustomDetails&&<option value="main_custom">Already included in the main custom venue details</option>}
   <option value="separate">Add catering details separately</option>
  </select></label>
  {source==='not_provided'&&<p className="muted">The listing will say catering details are not available yet. No price or policy will be assumed.</p>}
  {source==='main_custom'&&<p className="muted">Your main custom venue text will be shown as entered. You don’t need to enter catering information twice.</p>}
  {source==='separate'&&<>
   <label>Catering arrangement<select value={value.mode} onChange={e=>onChange({...value,mode:e.target.value as CateringPolicy['mode'],supplierIds:[],customDetailsSource:'separate'})}>
    {Object.entries(policyLabels).map(([mode,label])=><option value={mode} key={mode}>{label}</option>)}
   </select></label>
   {value.mode==='in_house_and_external'&&<p className="muted">Guests can choose the venue’s in-house catering or bring an outside caterer. In the notes, specify which prices apply to in-house catering and any charges or conditions for outside caterers.</p>}
   <label>Menu, per-plate prices & catering notes<textarea rows={5} maxLength={700} value={value.notes} placeholder={'Veg menu: ₹850 + 18% GST per person\nNon-veg menu: ₹1,400 + 18% GST per person\nAdd serving style, minimum guests and other charges if applicable.'} onChange={e=>onChange({...value,notes:e.target.value,customDetailsSource:'separate'})}/></label>
   <p className="muted">These notes will appear on the listing after publication.</p>
  </>}
 </section>;
}
