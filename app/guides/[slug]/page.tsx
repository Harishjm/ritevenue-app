import {SITE_ORIGIN} from '@/lib/launch';
import Link from '@/components/site-link';
import {notFound} from 'next/navigation';
import {guides} from '@/lib/guides';
import {BANGALORE_VENUES_PATH} from '@/lib/venue-collections';
export function generateStaticParams(){return guides.map(g=>({slug:g.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const g=guides.find(g=>g.slug===slug);return {title:g?.title||'Guide not found',description:g?.description,alternates:{canonical:SITE_ORIGIN+'/guides/'+slug},robots:{index:!!g,follow:!!g}};}
export default async function Guide({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const g=guides.find(g=>g.slug===slug);
 if(!g)notFound();
 const url=SITE_ORIGIN+'/guides/'+g.slug;
 const structuredData={
  '@context':'https://schema.org','@type':'Article',headline:g.title,description:g.description,
  mainEntityOfPage:url,url,dateModified:g.reviewedAt,
  author:{'@type':'Organization',name:'RiteVenue editorial',url:SITE_ORIGIN},
  publisher:{'@type':'Organization',name:'RiteVenue',url:SITE_ORIGIN},
 };
 const reviewedOn=new Date(g.reviewedAt+'T00:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
 return <main className="content-page narrow guide-article">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,'\\u003c')}}/>
  <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/guides">Planning guides</Link><span>/</span><span>{g.category.toLowerCase()}</span></nav>
  <article>
   <p className="eyebrow">{g.category}</p><h1>{g.title}</h1><p className="article-intro">{g.description}</p>
   <p className="guide-byline"><span>By RiteVenue editorial</span><span>Reviewed {reviewedOn}</span></p>
   <div className="prose">{g.sections.map(s=><section key={s.heading}><h2>{s.heading}</h2>{s.paragraphs.map(p=><p key={p}>{p}</p>)}{s.checklist&&<ul>{s.checklist.map(c=><li key={c}>{c}</li>)}</ul>}</section>)}</div>
  </article>
  <aside className="guide-venue-path"><h2>Put the checklist to use</h2><p>Compare published Bengaluru venues, then confirm details and availability directly with the venue.</p><Link href={BANGALORE_VENUES_PATH}>Explore wedding venues in Bangalore</Link></aside>
  <h2>Continue planning</h2><ul className="related-guides">{guides.filter(v=>v.slug!==slug).map(v=><li key={v.slug}><Link href={'/guides/'+v.slug}>{v.title}</Link></li>)}</ul>
 </main>;
}
