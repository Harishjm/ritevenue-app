import {rentalKeys,rentalLabels,rentalPriceLabel,packageTimeLabel,type ListingPricing,type PackageAvailability,type PackageTimings} from '@/lib/standard-rentals';
import {money} from '@/lib/venues';

export default function StandardRentalSummary({pricing,availability,timings}:{pricing:ListingPricing;availability:PackageAvailability;timings:PackageTimings}){
 return <dl className="standard-rental-summary">
  {rentalKeys.map(key=><div className="quote-line" key={key}><dt>{rentalLabels[key]}{(availability[key]==='available'||availability[key]==='price_on_request')&&<small className="package-slot-label">{packageTimeLabel(timings[key])}</small>}</dt><dd><strong>{rentalPriceLabel(availability[key],pricing[key])}</strong></dd></div>)}
  {([['extraHour','Extended access · per hour'],['ac','AC'],['generator','Generator'],['parking','Parking'],['cleaning','Cleaning']] as const).map(([key,label])=><div className="quote-line" key={key}><dt>{label}</dt><dd>{pricing[key]===0?'Included':money(pricing[key]/100)}</dd></div>)}
 </dl>;
}
