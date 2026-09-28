import {getAuthenticatedUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import {canonicalOwnerEntry} from '@/lib/owner-entry';
export const dynamic='force-dynamic';
export const metadata={title:'Venue partner sign in',robots:{index:false,follow:false}};
export default async function OwnerSignIn({searchParams}:{searchParams:Promise<{return_to?:string;error?:string}>}){
 const query=await searchParams,returnTo=query.return_to&&/^\/owner(?:\?|$)/.test(query.return_to)?query.return_to:'/owner';
 await canonicalOwnerEntry('/owner/sign-in?return_to='+encodeURIComponent(returnTo)+(query.error?'&error=google':''));
 if(await getAuthenticatedUser())redirect(returnTo);
 return <main className="content-page narrow"><h1>Your venue workspace.</h1><p>Sign in to save your progress, upload photos and respond to the RiteVenue review team.</p>{query.error&&<p className="error" role="alert">Google sign-in could not be completed. Please try again.</p>}<form action="/api/auth/google-start" method="post"><input type="hidden" name="audience" value="owner"/><input type="hidden" name="return_to" value={returnTo}/><button className="primary">Continue with Google</button></form><p className="muted">Use the Google account you want to manage your venues with.</p><a href="/list-your-venue">Back to listing your venue</a></main>;
}
