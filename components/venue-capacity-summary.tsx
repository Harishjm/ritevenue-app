import {capacityLabel,type CapacityDetails} from '@/lib/venue-capacity';

export default function VenueCapacitySummary({capacity,details}:{capacity:number;details?:CapacityDetails|null}){
 if(!details||!Object.values(details).some(Boolean))return null;
 return <section className="venue-capacity-summary"><h3>Guest capacity</h3><p>{capacityLabel(capacity,details)}</p><div>
  {details.seated!==null&&<span><strong>{details.seated.toLocaleString('en-IN')}</strong> seated</span>}
  {details.floating!==null&&<span><strong>{details.floating.toLocaleString('en-IN')}</strong> floating</span>}
 </div>{details.floating!==null&&<p className="muted">Floating capacity refers to guests attending across the event, rather than all being seated together.</p>}</section>;
}
