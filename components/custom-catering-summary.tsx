import {policyLabels,type CateringPolicy} from '@/lib/catering';

export default function CustomCateringSummary({policy}:{policy:CateringPolicy}){
 return <section className="custom-rental-summary"><h3>Catering details</h3>
  {policy.mode!=='unconfirmed'&&<p><strong>{policyLabels[policy.mode]}</strong></p>}
  {policy.notes?<div className="custom-rental-copy">{policy.notes}</div>:<p>Refer to the custom venue details for catering and menu information.</p>}
 </section>;
}
