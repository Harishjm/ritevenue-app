import VenueCardPreview from './venue-card-preview';
import {capacityLabel} from '@/lib/venue-capacity';
import {money} from '@/lib/venues';
import type {PublicVenue} from '@/lib/public-venues';
import {listingCardPrice} from '@/lib/listing-card-price';

export default function PublicVenueCard({venue}:{venue:PublicVenue}){
 const selectedPrice=listingCardPrice(venue);
 return <VenueCardPreview href={venue.publicPath} name={venue.name} images={venue.images} descriptions={venue.imageDescriptions} type={venue.type}>
  <div className="card-content">
   <p className="location">{venue.area}, {venue.city}</p>
   <h3>{venue.name}</h3>
   <p className="capacity">{capacityLabel(venue.capacity,venue.capacityDetails)}</p>
   <div className="card-bottom"><div>{!selectedPrice?<>
    <strong>{venue.rentalDetails&&venue.authorizationSource==='owner'?'View rental offers':'Price on request'}</strong>
    <small>Confirm all charges with the venue</small>
   </>:<>
    <strong>{money(selectedPrice.amount/100)}</strong><span> {selectedPrice.label} rental</span>
    <small>{selectedPrice.timing} · Owner-provided · Other charges on venue page</small>
   </>}</div></div>
  </div>
 </VenueCardPreview>;
}
