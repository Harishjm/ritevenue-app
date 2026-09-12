import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {guides} from '@/lib/guides';
export const metadata={title:'Bengaluru wedding venue planning guides',description:'Practical wedding venue planning: compare spaces, understand itemized rental pricing and prepare your Bengaluru venue shortlist.'};
export default function Guides(){return <main className="content-page"><p className="eyebrow">RITEVENUE / PLANNING JOURNAL</p><h1>A clearer path to your venue.</h1><p className="workspace-intro">Practical questions, thoughtful comparisons and fewer surprises. Start with the decisions that matter to your celebration.</p><div className="guide-grid">{guides.map(g=><Link href={'/guides/'+g.slug} className="guide-item" key={g.slug}><span className="eyebrow">{g.category}</span><h2>{g.title}</h2><p>{g.description}</p><span className="guide-link">Read guide <ArrowUpRight size={18}/></span></Link>)}</div></main>;}
