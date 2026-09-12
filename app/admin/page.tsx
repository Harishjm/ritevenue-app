import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {isAdmin} from '@/lib/demo-server';
import OwnerWorkspace from '@/components/owner-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Admin workspace',robots:{index:false,follow:false}};
export default async function Admin(){const user=await requireChatGPTUser('/admin');if(!isAdmin(user))return <main className="content-page"><h1>Admin access required</h1><p>This workspace is restricted to the project administrator.</p></main>;return <main className="content-page"><p className="eyebrow">RITEVENUE / ADMIN</p><h1>Keep every booking clear.</h1><p className="workspace-intro">Review owner drafts, manage sample pricing and monitor the shared booking demonstration.</p><OwnerWorkspace admin adminView/></main>;}
