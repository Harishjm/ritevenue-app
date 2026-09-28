import VenueIntakeForm from '@/components/venue-intake-form';
import OwnerStart from '@/components/owner-start';
import {SITE_ORIGIN} from '@/lib/launch';
import {canonicalOwnerEntry} from '@/lib/owner-entry';
export const dynamic='force-dynamic';
export const metadata={title:'List your venue — Bengaluru and beyond',description:'Create a venue listing, upload photos and save your progress. Sign in with Google to manage your venue or ask the RiteVenue team for assistance.',alternates:{canonical:SITE_ORIGIN+'/list-your-venue'}};
export default async function ListYourVenue(){await canonicalOwnerEntry('/list-your-venue');return <main className="content-page intake-page"><p className="eyebrow">RITEVENUE / VENUE PARTNERS</p><h1>Bring your venue to RiteVenue.</h1><p className="workspace-intro">Free listing. Start with the basics, then save your progress and return whenever you’re ready.</p><OwnerStart/><details className="owner-start"><summary>Prefer help from our team? Submit without an account</summary><p>Send an application and our team will contact you. To manage it yourself later, ask us to assign it to your Google account.</p><VenueIntakeForm/></details></main>;}
