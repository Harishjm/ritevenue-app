import {policyLabels,type CateringPolicy} from '@/lib/catering';

export default function CustomCateringSummary({policy}:{policy:CateringPolicy}){
 const source=policy.customDetailsSource??(policy.notes||policy.mode!=='unconfirmed'?'separate':null);
 return <section className="custom-rental-summary"><h3>Catering details</h3>
  {source==='not_provided'?<p>Catering details are not available yet. Please confirm menus, prices and catering rules directly with the venue.</p>:
   source==='main_custom'?<p>Catering information, if supplied, is included in the custom venue details above. Confirm the final terms with the venue.</p>:
   <>{policy.mode!=='unconfirmed'&&<p><strong>{policyLabels[policy.mode]}</strong></p>}
    {policy.notes?<div className="custom-rental-copy">{policy.notes}</div>:<p>Catering details have not been confirmed. Check the custom venue details or contact the venue.</p>}</>}
 </section>;
}
