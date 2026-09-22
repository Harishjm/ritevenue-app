import {requireAuthenticatedUser} from '@/lib/auth';
import {isAdmin} from '@/lib/demo-server';
import VenueIntakeReview from '@/components/venue-intake-review';
import OwnerWorkspace from '@/components/owner-workspace';
import AuthSignOut from '@/components/auth-sign-out';
export const dynamic='force-dynamic';
export const metadata={title:'Admin workspace',robots:{index:false,follow:false}};
export default async function Admin(){const user=await requireAuthenticatedUser('/admin');if(!isAdmin(user))return <main className="content-page"><h1>Admin access required</h1><p>This workspace is restricted to the project administrator.</p></main>;return <main className="content-page"><p className="eyebrow">RITEVENUE / ADMIN</p><h1>Manage venues & wedding enquiries.</h1><p className="workspace-intro">Check listing permission, photographs, rental charges and calendar information before publishing a listing.</p><div className="workspace-actions"><a className="primary" href="/admin/enquiries">Wedding enquiry inbox</a><a className="primary" href="/admin/catering">Review catering suppliers</a><AuthSignOut/></div><VenueIntakeReview/><section id="admin-drafts"><h2>Prepare & edit your venue drafts</h2><p>Applications converted to drafts appear here. Finish their details, then submit them for final review.</p><OwnerWorkspace admin/></section><section><h2>Final listing review</h2><OwnerWorkspace admin adminView/></section></main>;}
