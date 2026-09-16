import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {isAdmin} from '@/lib/demo-server';
import OwnerWorkspace from '@/components/owner-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Venue owner workspace',robots:{index:false,follow:false}};
export default async function Owner(){const user=await requireChatGPTUser('/owner');return <main className="content-page"><p className="eyebrow">VENUE OWNER WORKSPACE</p><h1>Your venue, ready to showcase.</h1><p className="workspace-intro">Prepare your listing and itemized pricing. Upload photos you have permission to share, then send the draft for review.</p><div className="notice">Submit genuine venue details and photos you are authorized to share. Give public publication permission to request a public listing. Admin approval is required. Listing edits hide it until reviewed again; calendar-only updates stay live. Online booking and payments are disabled.</div><div className="workspace-actions"><a className="filter-button" href="/caterer">Manage a catering business</a></div><OwnerWorkspace admin={isAdmin(user)}/></main>;}
