import CustomCateringSummary from '@/components/custom-catering-summary';
import VenueCapacitySummary from '@/components/venue-capacity-summary';
import VenueOverview from '@/components/venue-overview';
import PublicCalendar from '@/components/public-calendar';
import RentalOfferSummary from '@/components/rental-offer-summary';
import StandardRentalSummary from '@/components/standard-rental-summary';
import VenuePoliciesSummary from '@/components/venue-policies-summary';
import {capacityLabel} from '@/lib/venue-capacity';
import {notFound,permanentRedirect} from 'next/navigation';
import {publicVenue,publicVenues} from '@/lib/public-venues';
import {SITE_ORIGIN,publicIndexingEnabled} from '@/lib/launch';
import {money} from '@/lib/venues';
import {policyLabels} from '@/lib/catering';
import {matchesVenueUrl} from '@/lib/venue-url';
import {relatedVenues,venueSeoDescription,venueSeoTitle} from '@/lib/venue-seo';

export const dynamic='force-dynamic';

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const venue=await publicVenue(slug),index=publicIndexingEnabled();
 return venue?{
  title:venueSeoTitle(venue),
  description:venueSeoDescription(venue),
  alternates:{canonical:SITE_ORIGIN+venue.publicPath},
  robots:{index,follow:index},
 }:{title:'Venue not found',robots:{index:false,follow:false}};
}

export default async function Venue({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {slug}=await params;
 const venues=await publicVenues();
 const venue=venues.find(item=>matchesVenueUrl(slug,item.slug.slice('owner-'.length)));
 if(!venue)notFound();
 if(slug!==venue.publicSlug){
  const query=new URLSearchParams();
  for(const [key,value] of Object.entries(await searchParams)){
   for(const item of Array.isArray(value)?value:value===undefined?[]:[value])query.append(key,item);
  }
  permanentRedirect(venue.publicPath+(query.size?'?'+query.toString():''));
 }
 const nearby=relatedVenues(venues,venue);
 return <main className="content-page">
  <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">Venues</a><span>/</span><span>{venue.area}</span></nav>
  <div className="detail-title">
   <span className="tag">{venue.type} · {venue.authorizationSource==='admin'?'RiteVenue-curated listing':'Owner-approved listing'}</span>
   <h1>{venue.name}</h1>
   <p>{venue.area}, {venue.city} · {capacityLabel(venue.capacity,venue.capacityDetails)}</p>
  </div>
  <a className="primary" href="#availability">View calendar</a>
  <img className="detail-photo" src={venue.images[0]} alt={venue.imageDescriptions[0]} width={1200} height={600}/>
  <p className="photo-caption">{venue.authorizationSource==='admin'?'Photographs published by RiteVenue under its own rights; this listing is not owner-approved.':'Photographs supplied by the venue for public display.'}</p>
  {venue.images.length>1&&<div className="venue-gallery">{venue.images.slice(1).map((src,i)=><img src={src} key={src} alt={venue.imageDescriptions[i+1]} width={600} height={400} loading="lazy"/>)}</div>}
  <VenueCapacitySummary capacity={venue.capacity} details={venue.capacityDetails}/>
  <VenueOverview address={venue.address} description={venue.description}/>
  {venue.rentalDetails&&<RentalOfferSummary value={venue.rentalDetails} showPrices={venue.authorizationSource==='owner'}/>}
  {venue.authorizationSource==='owner'&&!venue.rentalDetails&&<section className="public-prices">
   <h2>Rental information</h2>
   <p>Owner-provided amounts, subject to confirmation. These are not a final quote or a price-lock guarantee.</p>
   <StandardRentalSummary pricing={venue.pricing} availability={venue.packageAvailability} timings={venue.packageTimings}/>
   <p className="muted">Taxes, food, optional services and final terms must be confirmed with the venue. No online payment is collected.</p>
  </section>}
  {venue.authorizationSource==='admin'&&<section className="public-prices">
   <h2>Rental information</h2>
   <p>{venue.rentalDetails?.version===2?'The custom details above are published by RiteVenue. Confirm prices and availability directly with the venue.':'Prices and availability have not been confirmed by the venue. Contact the venue directly for a quote.'}</p>
  </section>}
  {venue.rentalDetails&&<CustomCateringSummary policy={venue.cateringPolicy}/>}
  {venue.authorizationSource==='owner'&&!venue.rentalDetails&&<section className="catering-policy"><div>
   <h2>{policyLabels[venue.cateringPolicy.mode]}</h2>
   <p>{venue.cateringPolicy.notes||'Ask the venue to confirm its food and outside-caterer rules.'}</p>
   <p>Catering / kitchen fee: {money(venue.cateringPolicy.venueFee/100)} · Minimum food spend: {money(venue.cateringPolicy.minimumFoodSpend/100)}. Catering booking is not offered during this launch.</p>
  </div></section>}
  <VenuePoliciesSummary value={venue.policies}/>
  <PublicCalendar slug={venue.slug} initialCalendar={venue.calendar} initialUpdatedAt={venue.calendarUpdatedAt||''} source={venue.authorizationSource}/>
  {nearby.length>0&&<section className="related-venues" aria-labelledby="related-venues-title">
   <h2 id="related-venues-title">More wedding venues in {venue.city}</h2>
   <p>Compare other published spaces and their reported details.</p>
   <div className="related-venues-list">{nearby.map(item=><a href={item.publicPath} key={item.slug}>
    <span>{item.area}, {item.city}</span>
    <strong>{item.name}</strong>
    <small>{item.type} · {capacityLabel(item.capacity,item.capacityDetails)}</small>
   </a>)}</div>
  </section>}
 </main>;
}
