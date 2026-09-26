import type {RentalDetails} from '@/lib/venue-offers';
import {taxLabel,offerHours} from '@/lib/venue-offers';
import {money} from '@/lib/venues';
export default function RentalOfferSummary({value,showPrices=true}:{value:RentalDetails;showPrices?:boolean}){
 const amount=(n:number|null)=>n===null?'Price on request':money(n/100);
 const applies=(ids:string[])=>ids.length?ids.map(id=>value.offers.find(o=>o.id===id)?.name).join(', '):'All offers';
 return <section className="stack-form"><h3>Rental offers & inclusions</h3><p>Reported information only. No online booking or payment. Confirm the final quote, taxes, setup access and terms with the venue.</p>
 {!!value.spaces.length&&<><h4>Event spaces</h4><ul>{value.spaces.map(s=><li key={s.id}>{s.name}{s.capacity!==null?` · Up to ${s.capacity} guests`:' · Capacity unconfirmed'}</li>)}</ul></>}
 {value.offers.map(o=><section key={o.id}><h4>{o.name}</h4><p>{o.spaceIds.length?o.spaceIds.map(id=>value.spaces.find(s=>s.id===id)?.name).join(' + '):'Whole venue'} · {offerHours(o)}</p><p>{o.status!=='available'?(o.status==='not_applicable'?'Not applicable':'Not available'):showPrices?<>{amount(o.amount)}{o.amount!==null&&` per event · ${taxLabel(o.tax)}`}</>:'Price on request · Venue confirmation required'}</p><p>{({optional:'Food is optional and charged separately.',required:'Menu purchase is required and charged separately.',not_included:'Food is not included in venue rental.',unconfirmed:'Food arrangement is unconfirmed.'})[o.food]}</p>{o.notes&&<p>{o.notes}</p>}</section>)}
 {!!value.facilities.length&&<><h4>Facilities</h4><ul>{value.facilities.map((f,i)=><li key={i}>{f.name}{f.quantity!==null?` × ${f.quantity}`:''} · {f.status==='included'?'Included':f.status==='not_available'?'Not available':'Unconfirmed'}</li>)}</ul></>}
 {showPrices&&!!value.charges.length&&<><h4>Separate charges—not included in rental</h4><ul>{value.charges.map((c,i)=><li key={i}>{c.name} · {amount(c.amount)} / {c.basis.replace('per_','')} · {taxLabel(c.tax)} · {c.required?'Mandatory':'Optional'} · {applies(c.offerIds)}</li>)}</ul></>}
 {showPrices&&!!value.menus.length&&<><h4>Food menus—not included in rental</h4><ul>{value.menus.map((m,i)=><li key={i}>{m.name} · {m.diet.replaceAll('_',' ')} · {m.style.replaceAll('_',' ')} · {amount(m.perPerson)} per person · {taxLabel(m.tax)} · {m.minimumGuests===null?'Minimum guests unconfirmed':`Minimum ${m.minimumGuests} billable guests`} · {applies(m.offerIds)}</li>)}</ul></>}
 </section>;
}
