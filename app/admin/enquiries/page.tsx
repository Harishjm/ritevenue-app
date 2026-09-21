import Link from 'next/link';
import {requireAuthenticatedUser,isAdminUser} from '@/lib/auth';
import WeddingEnquiryInbox from '@/components/wedding-enquiry-inbox';
import AuthSignOut from '@/components/auth-sign-out';

export const dynamic='force-dynamic';
export const metadata={title:'Wedding enquiries',robots:{index:false,follow:false}};
export default async function Enquiries(){
 const user=await requireAuthenticatedUser('/admin/enquiries');
 if(!isAdminUser(user))return <main className="content-page"><h1>Admin access required</h1><p>This inbox is restricted to the RiteVenue administrator.</p></main>;
 return <main className="content-page"><p className="eyebrow">RITEVENUE / WEDDING ASSISTANCE</p><h1>Conversations into celebrations.</h1><p className="workspace-intro">Review couples’ preferences, assign a coordinator and keep track of the next conversation. Contact details and notes stay private.</p><div className="workspace-actions"><Link className="filter-button" href="/admin">Venue administration</Link><Link className="filter-button" href="/plan-your-wedding">View enquiry form</Link><AuthSignOut/></div><WeddingEnquiryInbox/></main>;
}
