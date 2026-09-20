import {z} from 'zod';
import {AuthError,getAuthenticatedUser,requestAdminOtp,signOut,verifyAdminOtp} from '@/lib/auth';
import {readBody} from '@/lib/demo-server';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const json=(body:unknown,status=200,extra:HeadersInit={})=>Response.json(body,{status,headers:{...headers,...extra}});
function sameOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin;}
function errorResponse(error:unknown){if(error instanceof AuthError)return json({error:error.message},error.status);return json({error:'Sign-in is temporarily unavailable. Please retry.'},503);}
export async function GET(request:Request,{params}:{params:Promise<{action:string}>}){const {action}=await params;if(action!=='session')return json({error:'Not found'},404);try{const user=await getAuthenticatedUser(request);return json({authenticated:Boolean(user),user:user?{email:user.email,role:user.role}:null});}catch(error){return errorResponse(error);}}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 try{
  if(!sameOrigin(request))throw new AuthError(403,'This sign-in request is not allowed.');
  const {action}=await params;
  if(action==='sign-out')return json({signedOut:true},200,{'Set-Cookie':await signOut(request)});
  let body:unknown;try{body=await readBody(request);}catch{throw new AuthError(400,'Check the sign-in form and try again.');}
  if(action==='request-otp'){
   const parsed=z.object({email:z.string().email().max(254)}).strict().safeParse(body);if(!parsed.success)throw new AuthError(400,'Enter a valid email address.');
   return json(await requestAdminOtp(request,parsed.data.email),202);
  }
  if(action==='verify-otp'){
   const parsed=z.object({challengeId:z.string().uuid(),code:z.string().regex(/^\d{6}$/)}).strict().safeParse(body);if(!parsed.success)throw new AuthError(400,'Enter the six-digit code.');
   const result=await verifyAdminOtp(request,parsed.data.challengeId,parsed.data.code);return json({authenticated:true},200,{'Set-Cookie':result.cookie});
  }
  return json({error:'Not found'},404);
 }catch(error){return errorResponse(error);}
}
