import {getAuthenticatedUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import OwnerPortal from '@/components/owner-portal';
import {canonicalOwnerEntry} from '@/lib/owner-entry';
export const dynamic='force-dynamic';
export const metadata={title:'Venue owner workspace',robots:{index:false,follow:false}};
export default async function Owner({searchParams}:{searchParams:Promise<{venue?:string;resume?:string}>}){
 const query=await searchParams,returnTo='/owner'+(query.venue?'?venue='+encodeURIComponent(query.venue):query.resume?'?resume=1':'');
 await canonicalOwnerEntry(returnTo);
 if(!await getAuthenticatedUser())redirect('/owner/sign-in?return_to='+encodeURIComponent(returnTo));
 return <main className="content-page"><p className="eyebrow">RITEVENUE / VENUE PARTNERS</p><h1>Your venues, all in one place.</h1><p className="workspace-intro">Save your progress, share photographs and respond to our review team. Changes go live after approval.</p><OwnerPortal initialVenue={query.venue} resume={query.resume==='1'}/></main>;
}
