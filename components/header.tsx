import {MapPin,ArrowUpRight} from 'lucide-react';
import Link from 'next/link';
import {BANGALORE_VENUES_PATH} from '@/lib/venue-collections';

export function Header(){return <>
 <div className="pilot-bar">RITEVENUE · BENGALURU<span>Venue discovery & reported calendars · No online payments</span></div>
 <header className="site-header">
  <Link href="/" className="logo" aria-label="RiteVenue home"><MapPin size={28} strokeWidth={2.5}/>Rite<span>Venue</span><i/></Link>
  <nav aria-label="Main navigation">
   <Link href="/">Explore venues</Link>
   <Link href={BANGALORE_VENUES_PATH}>Bangalore venues</Link>
   <Link href="/guides">Planning guides</Link>
   <Link href="/plan-your-wedding">Plan your wedding</Link>
   <Link href="/list-your-venue" className="owner-link">List your venue <ArrowUpRight size={16}/></Link>
  </nav>
 </header>
 </>;}

export function Footer(){return <footer className="seo-footer">
 <div className="footer-brand">RiteVenue<span>Spaces for Bengaluru’s celebrations.</span></div>
 <div className="footer-link-groups">
  <div><strong>Explore</strong><Link href="/">All published venues</Link><Link href={BANGALORE_VENUES_PATH}>Wedding venues in Bangalore</Link><Link href="/list-your-venue">List your venue</Link></div>
  <div><strong>Plan</strong><Link href="/guides">All planning guides</Link><Link href="/guides/bengaluru-wedding-venue-checklist">Venue visit checklist</Link><Link href="/guides/guest-count-and-venue-capacity">Guest capacity guide</Link></div>
  <div><strong>Compare</strong><Link href="/guides/understand-venue-rental-pricing">Rental quote guide</Link><Link href="/guides/indoor-outdoor-wedding-venue">Indoor or outdoor?</Link><Link href="/plan-your-wedding">Wedding assistance</Link></div>
  <div><strong>RiteVenue</strong><Link href="/how-it-works">How it works</Link><Link href="/privacy">Privacy & terms</Link></div>
 </div>
 <small>© {new Date().getFullYear()} RiteVenue · Check each listing&apos;s information source and confirm details with the venue. Online booking and payments are not enabled.</small>
 </footer>;}
