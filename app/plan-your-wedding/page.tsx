import Link from 'next/link';
import {HeartHandshake,MapPin,MessageCircle,Check} from 'lucide-react';
import WeddingEnquiryForm from '@/components/wedding-enquiry-form';
import {SITE_ORIGIN,publicIndexingEnabled} from '@/lib/launch';
import {planningToday} from '@/lib/wedding-enquiries';

export const dynamic='force-dynamic';
export function generateMetadata(){return {title:'Plan your wedding in Bengaluru',description:'Tell RiteVenue your preferred location, guest count and budget. Request personal help with venue shortlisting, catering and wedding planning in Bengaluru.',alternates:{canonical:SITE_ORIGIN+'/plan-your-wedding'},robots:{index:publicIndexingEnabled(),follow:publicIndexingEnabled()}};}

export default function PlanYourWedding(){return <main className="wedding-page">
 <div className="wedding-heading"><p className="eyebrow">BENGALURU · WEDDING ASSISTANCE</p><h1>Your wedding.<br/><em>A little less to worry about.</em></h1><p>From finding a venue to bringing the day together, tell us what you have in mind. We’ll help you explore the next steps.</p></div>
 <div className="wedding-layout">
  <aside className="wedding-aside">
   <div className="wedding-illustration" aria-hidden="true"><HeartHandshake size={40}/><span>One conversation.<br/>A more personal plan.</span></div>
   <h2>Start wherever you are.</h2><p>You don’t need every detail figured out. A few preferences give us a place to begin.</p>
   <ol className="wedding-steps"><li><MapPin size={21} aria-hidden="true"/><div><strong>Tell us your preferences</strong><p>Location, guest count and the kind of help you need.</p></div></li><li><MessageCircle size={21} aria-hidden="true"/><div><strong>Let’s talk it through</strong><p>Our team contacts you to understand your plans.</p></div></li><li><Check size={21} aria-hidden="true"/><div><strong>Explore your options</strong><p>Discuss venues and services before making any commitment.</p></div></li></ol>
   <p className="muted">Planning for someone in your family? You’re welcome to enquire on their behalf using your own contact details.</p>
   <Link href="/" className="wedding-directory-link">Prefer to browse? Explore our venues →</Link>
  </aside>
  <WeddingEnquiryForm today={planningToday()}/>
 </div>
 </main>;}
