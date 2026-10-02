export default function VenuePoliciesSummary({value}:{value:string}){
 if(!value.trim())return null;
 return <section className="custom-rental-summary venue-policies-summary">
  <h2>Policies & house rules</h2>
  <div className="custom-rental-copy">{value}</div>
  <p className="muted">Confirm the latest policies and final terms directly with the venue before making arrangements.</p>
 </section>;
}
