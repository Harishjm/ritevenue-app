import {MapPin} from 'lucide-react';

export default function VenueOverview({address,description}:{address:string;description:string}){
  return <section className="venue-overview" aria-labelledby="about-venue-title">
    <div className="venue-address">
      <MapPin size={24} aria-hidden="true"/>
      <div>
        <p className="venue-address-label">Address</p>
        <p className="venue-address-text">{address}</p>
      </div>
    </div>
    <h2 id="about-venue-title">About the venue</h2>
    <p className="venue-overview-description">{description}</p>
  </section>;
}
