import {requireChatGPTUser} from '@/app/chatgpt-auth';
import CatererWorkspace from '@/components/caterer-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Caterer workspace',robots:{index:false,follow:false}};
export default async function Caterer(){await requireChatGPTUser('/caterer');return <main className="content-page"><p className="eyebrow">CATERER WORKSPACE</p><h1>Your food. Your menus. Clear pricing.</h1><p className="workspace-intro">Prepare menus, state your service areas and dates, and submit your business for review.</p><div className="notice">Private prototype. Approval enables discovery and estimates only. Catering reservations, advance payments and supplier notifications are not enabled.</div><CatererWorkspace/></main>;}
