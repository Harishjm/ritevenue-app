'use client';

import {policyLabels,type CateringPolicy} from '@/lib/catering';

export default function CustomCateringEditor({value,onChange}:{value:CateringPolicy;onChange:(value:CateringPolicy)=>void}){
 return <section className="custom-rental-editor">
  <h3>Catering details <span className="muted">Optional</span></h3>
  <p>Add catering information here, or keep it in your main custom venue text. You don’t need to enter it twice.</p>
  <label>Catering arrangement<select value={value.mode} onChange={e=>onChange({...value,mode:e.target.value as CateringPolicy['mode'],supplierIds:[]})}>
   <option value="unconfirmed">Use the main custom details</option>
   {Object.entries(policyLabels).filter(([mode])=>mode!=='unconfirmed').map(([mode,label])=><option value={mode} key={mode}>{label}</option>)}
  </select></label>
  <label>Menu, per-plate prices & catering notes<textarea rows={5} maxLength={700} value={value.notes} placeholder={'Veg menu: ₹850 + 18% GST per person\nNon-veg menu: ₹1,400 + 18% GST per person\nAdd serving style, minimum guests and other charges if applicable.'} onChange={e=>onChange({...value,notes:e.target.value})}/></label>
  <p className="muted">These notes will appear on the listing after publication. If menus and prices are in the main custom text, they will stay there as entered.</p>
 </section>;
}
