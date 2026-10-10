import type {Metadata} from 'next';
import Link from '@/components/site-link';
import PublicVenueCard from '@/components/public-venue-card';
import {SITE_ORIGIN,publicIndexingEnabled} from '@/lib/launch';
import {publicVenues} from '@/lib/public-venues';
import {bangaloreVenues,BANGALORE_VENUES_PATH,hasUsefulBangaloreCollection} from '@/lib/venue-collections';

export const dynamic='force-dynamic';

export async function generateMetadata():Promise<Metadata>{
 let venues:Awaited<ReturnType<typeof publicVenues>>=[];
 try{venues=await publicVenues();}catch{/* Keep the collection out of the index until data is available. */}
 const index=publicIndexingEnabled()&&hasUsefulBangaloreCollection(venues);
 return {
  title:'Wedding Venues in Bangalore: Halls, Lawns & Resorts',
  description:'Explore published wedding venues in Bangalore (Bengaluru). Compare locations, guest capacity, photographs and rental details, then confirm availability with the venue.',
  alternates:{canonical:SITE_ORIGIN+BANGALORE_VENUES_PATH},
  robots:{index,follow:index},
 };
}

export default async function BangaloreVenues(){
 let venues:Awaited<ReturnType<typeof publicVenues>>=[];
 let unavailable=false;
 try{venues=bangaloreVenues(await publicVenues());}catch{unavailable=true;}
 const areas=Array.from(new Set(venues.map(venue=>venue.area.trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
 const rajajinagarVenues=venues.filter(venue=>venue.area.trim().toLowerCase()==='rajajinagar');
 return <main className="content-page city-collection">
  <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Explore venues</Link><span>/</span><span>Bangalore</span></nav>
  <p className="eyebrow">BANGALORE · BENGALURU</p>
  <h1>Wedding venues in Bangalore</h1>
  <p className="collection-intro">Compare published halls, lawns, resorts and other celebration spaces around Bengaluru. Start with the guest count and location that work for your event, then ask each venue to confirm its current quote, available spaces and date.</p>
  <div className="collection-facts" aria-label="How to compare venues">
   <div><strong>Location</strong><p>Consider guest travel, parking, accommodation and the route between ceremony and dining.</p></div>
   <div><strong>Space</strong><p>Ask for capacity in your actual layout, including seating, stage, food service and circulation.</p></div>
   <div><strong>Complete quote</strong><p>Compare the same hours and inclusions. Confirm food, taxes, mandatory charges and overtime in writing.</p></div>
  </div>
  <section aria-labelledby="bangalore-list-title" className="collection-list">
   <div className="results-heading"><div><p className="eyebrow">PUBLISHED BANGALORE LISTINGS</p><h2 id="bangalore-list-title">{unavailable?'Venue directory temporarily unavailable':venues.length?`${venues.length} venues to explore`:'Bangalore venues are being added'}</h2><p>Listings show details approved for public display; rental and calendar information may need direct confirmation.</p></div></div>
   {areas.length>0&&<p className="collection-areas"><strong>Areas currently listed:</strong> {areas.join(' · ')}</p>}
   {venues.length?<div className="venue-grid">{venues.map(venue=><PublicVenueCard key={venue.slug} venue={venue}/>)}</div>:<div className="public-empty"><p>{unavailable?'Please try again shortly.':'Our published collection is growing. Tell us your guest count and area, and we can help you begin a shortlist.'}</p><Link className="primary" href="/plan-your-wedding">Get wedding planning help</Link></div>}
  </section>
  {rajajinagarVenues.length>=2&&<section className="collection-area-advice" aria-labelledby="rajajinagar-title">
   <p className="eyebrow">PLAN A RAJAJINAGAR VISIT</p>
   <h2 id="rajajinagar-title">Compare the Rajajinagar venues in person</h2>
   <p>There are currently {rajajinagarVenues.length} published Rajajinagar listings on RiteVenue. Use the same event date, guest count and schedule when asking each venue for details. A stated capacity is only a starting point: ask to see the ceremony and dining layouts for your expected number of guests.</p>
   <div className="collection-area-links">{rajajinagarVenues.map(venue=><Link key={venue.slug} href={venue.publicPath}>{venue.name} <span>View listing</span></Link>)}</div>
   <p>Before visiting, ask which spaces are included, when setup can begin, how guests reach the entrance, and what the written quote covers. Confirm current availability, rental hours and charges directly with each venue; the listings may describe different packages.</p>
  </section>}
  <section className="collection-advice" aria-labelledby="choosing-title">
   <h2 id="choosing-title">Choosing a Bangalore wedding venue</h2>
   <p>A maximum guest number alone cannot tell you whether a ceremony, seated meal and reception fit comfortably. Ask for a layout for your actual guest count. If you need an outdoor space, confirm the covered backup area and whether it is reserved for your date.</p>
   <p>Rental amounts are only comparable when the access period and inclusions match. Ask which rooms, furniture, power, cleaning and catering arrangements are included. If a listing says “Price on request,” request a written itemized quote; it does not indicate a lower price.</p>
   <div className="collection-guide-links">
    <Link href="/guides/bengaluru-wedding-venue-checklist">Use the venue visit checklist</Link>
    <Link href="/guides/understand-venue-rental-pricing">Compare rental quotes</Link>
    <Link href="/guides/guest-count-and-venue-capacity">Plan for your guest count</Link>
    <Link href="/guides/indoor-outdoor-wedding-venue">Compare indoor and outdoor spaces</Link>
    <Link href="/guides/banquet-hall-lawn-or-resort">Choose between a banquet hall, lawn and resort</Link>
    <Link href="/guides/intimate-wedding-venue-bangalore">Plan an intimate Bangalore wedding</Link>
    <Link href="/guides/simple-wedding-planning-bangalore">Decide what to keep, simplify or skip</Link>
   </div>
  </section>
 </main>;
}
