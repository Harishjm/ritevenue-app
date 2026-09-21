import {AuthError,getAuthenticatedUser,signOut} from '@/lib/auth';
import {startGoogleSignIn,finishGoogleSignIn,googleFailure} from '@/lib/google-auth';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(body:unknown,status=200,extra:HeadersInit={})=>Response.json(body,{status,headers:{...headers,...extra}});
function errorResponse(error:unknown){if(error instanceof AuthError)return json({error:error.message},error.status);return json({error:'Sign-in is temporarily unavailable. Please retry.'},503);}
export async function GET(request:Request,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;
 if(action==='google-callback'){try{return await finishGoogleSignIn(request);}catch{return googleFailure(request);}}
 if(action!=='session')return json({error:'Not found'},404);
 try{const user=await getAuthenticatedUser(request);return json({authenticated:Boolean(user),user:user?{email:user.email,role:user.role}:null});}catch(error){return errorResponse(error);}
}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new AuthError(403,'This sign-in request is not allowed.');
  if(action==='sign-out')return json({signedOut:true},200,{'Set-Cookie':await signOut(request)});
  if(action==='google-start'){
   if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))throw new AuthError(400,'Invalid sign-in form.');
   const reader=request.body?.getReader();let body='';
   if(reader){let size=0;const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw new AuthError(413,'Invalid sign-in form.');}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();}
   return await startGoogleSignIn(request,new URLSearchParams(body).get('return_to')||'/admin');
  }
  // Email OTP implementation is retained for Phase 2, but has no public endpoint.
  return json({error:'Not found'},404);
 }catch(error){if(action==='google-start'&&!(error instanceof AuthError&&[400,403,413,429].includes(error.status)))return googleFailure(request);return errorResponse(error);}
}
