import Link from 'next/link';
import {ArrowRight,HeartHandshake} from 'lucide-react';

export default function WeddingAssistanceBanner(){return <section className="wedding-banner" aria-labelledby="wedding-banner-title"><div className="wedding-banner-icon"><HeartHandshake size={32} aria-hidden="true"/></div><div><p className="eyebrow">PLANNING A WEDDING IN BENGALURU?</p><h2 id="wedding-banner-title">Tell us your plans. We’ll help with the next step.</h2><p>Share your location, guest count and budget for personal assistance with venues, catering and wedding planning.</p></div><Link href="/plan-your-wedding" className="primary">Help plan my wedding <ArrowRight size={18}/></Link></section>;}
