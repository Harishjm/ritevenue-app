import AdminSignIn from '@/components/admin-sign-in';
import {getAuthenticatedUser,isAdminUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'Administrator sign in',robots:{index:false,follow:false}};
function safeReturn(value:string|undefined){if(!value?.startsWith('/')||value.startsWith('//'))return '/admin';try{const url=new URL(value,'https://app.local');return url.origin==='https://app.local'&&url.pathname!=='/admin/sign-in'?`${url.pathname}${url.search}${url.hash}`:'/admin';}catch{return '/admin';}}
export default async function SignIn({searchParams}:{searchParams:Promise<{return_to?:string;error?:string}>}){const params=await searchParams,returnTo=safeReturn(params.return_to),user=await getAuthenticatedUser();if(user&&isAdminUser(user))redirect(returnTo);return <main className="content-page narrow"><AdminSignIn returnTo={returnTo} error={params.error}/></main>;}
