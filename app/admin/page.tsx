import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {isAdmin} from '@/lib/demo-server';
import VenueIntakeReview from '@/components/venue-intake-review';
import OwnerWorkspace from '@/components/owner-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Admin workspace',robots:{index:false,follow:false}};
export default async function Admin(){const user=await requireChatGPTUser('/admin');if(!isAdmin(user))return <main className="content-page"><h1>Admin access required</h1><p>This workspace is restricted to the project administrator.</p></main>;return <main className="content-page"><p className="eyebrow">RITEVENUE / ADMIN</p><h1>Review venues for public display.</h1><p className="workspace-intro">Check owner authorization, public-display permission, photographs, rental charges and calendar information before publishing a listing.</p><div className="workspace-actions"><a className="primary" href="/admin/catering">Review catering suppliers</a></div><VenueIntakeReview/><OwnerWorkspace admin adminView/></main>;}
