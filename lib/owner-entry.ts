import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';

// Start the form on the OAuth callback host, before storing any anonymous progress.
// Otherwise apex/www redirects would leave sessionStorage on a different origin.
export async function canonicalOwnerEntry(path:string){
 const callback=(env as unknown as {RITEVENUE_GOOGLE_REDIRECT_URI?:string}).RITEVENUE_GOOGLE_REDIRECT_URI;
 if(!callback)return;
 let target:URL;try{target=new URL(callback);}catch{return;}
 if(target.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(target.hostname))return;
 const requestHeaders=await headers(),host=requestHeaders.get('host');
 if(host&&host!==target.host)redirect(target.origin+path);
}
