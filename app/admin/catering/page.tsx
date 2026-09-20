import {requireAuthenticatedUser} from '@/lib/auth';
import {isAdmin} from '@/lib/demo-server';
import CatererWorkspace from '@/components/caterer-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Catering review',robots:{index:false,follow:false}};
export default async function CateringAdmin(){const user=await requireAuthenticatedUser('/admin/catering');if(!isAdmin(user))return <main className="content-page"><h1>Admin access required</h1><p>Only the project administrator can review catering submissions.</p></main>;return <main className="content-page"><p className="eyebrow">RITEVENUE / CATERING REVIEW</p><h1>Review every menu before discovery.</h1><p className="workspace-intro">Check submitted photos, service areas, date ranges, package inclusions and all charges. Approval is for private demonstration only.</p><CatererWorkspace adminView/></main>;}
