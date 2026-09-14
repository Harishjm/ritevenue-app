import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {isAdmin} from '@/lib/demo-server';
import OwnerWorkspace from '@/components/owner-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Venue owner workspace',robots:{index:false,follow:false}};
export default async function Owner(){const user=await requireChatGPTUser('/owner');return <main className="content-page"><p className="eyebrow">VENUE OWNER WORKSPACE</p><h1>Your venue, ready to showcase.</h1><p className="workspace-intro">Prepare your listing and itemized pricing. Upload photos you have permission to share, then send the draft for review.</p><div className="notice">Private onboarding prototype. Approval adds your venue to the private catalog with a simulated booking calendar. Saving edits hides it until it is approved again. No real bookings are enabled. Owners must agree to the inventory, pricing and cancellation terms before launch.</div><div className="workspace-actions"><a className="filter-button" href="/caterer">Manage a catering business</a></div><OwnerWorkspace admin={isAdmin(user)}/></main>;}
