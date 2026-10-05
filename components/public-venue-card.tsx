import VenueCardPreview from './venue-card-preview';
import {capacityLabel} from '@/lib/venue-capacity';
import {money} from '@/lib/venues';
import type {PublicVenue} from '@/lib/public-venues';

export default function PublicVenueCard({venue}:{venue:PublicVenue}){
 const priceOnRequest=venue.authorizationSource==='admin'||!!venue.rentalDetails||venue.packageAvailability.rent!=='available'||venue.pricing.rent===null;
 return <VenueCardPreview href={venue.publicPath} name={venue.name} images={venue.images} descriptions={venue.imageDescriptions} type={venue.type}>
  <div className="card-content">
   <p className="location">{venue.area}, {venue.city}</p>
   <h3>{venue.name}</h3>
   <p className="capacity">{capacityLabel(venue.capacity,venue.capacityDetails)}</p>
   <div className="card-bottom"><div>{priceOnRequest?<>
    <strong>{venue.rentalDetails&&venue.authorizationSource==='owner'?'View rental offers':'Price on request'}</strong>
    <small>Confirm all charges with the venue</small>
   </>:<>
    <strong>{money(venue.pricing.rent!/100)}</strong><span> full-day base rent</span>
    <small>Owner-provided · Other charges on venue page</small>
   </>}</div></div>
  </div>
 </VenueCardPreview>;
}
