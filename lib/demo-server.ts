import {env} from 'cloudflare:workers';
import {getChatGPTUser,type ChatGPTUser} from '@/app/chatgpt-auth';
import {db} from './db';
import {venues} from './venues';
import {ownerListing} from './owner-venue';
import {defaultPricing,pricingSchema,type Pricing} from './booking';
export const noStore={'Cache-Control':'private, no-store','Vary':'Cookie'};
export function isAdmin(user:ChatGPTUser){const email=(env as unknown as {RITEVENUE_ADMIN_EMAIL?:string}).RITEVENUE_ADMIN_EMAIL;return !!email&&user.email.toLowerCase()===email.toLowerCase();}
export async function apiUser(request?:Request){const user=await getChatGPTUser();if(!user)throw new Error('AUTH');if(request&&request.method!=='GET'&&request.headers.get('origin')!==new URL(request.url).origin)throw new Error('ORIGIN');return user;}
export function apiError(error:unknown){const message=error instanceof Error?error.message:'';const status=message==='AUTH'?401:message==='ORIGIN'||message==='FORBIDDEN'?403:message==='NOT_FOUND'?404:503;return Response.json({error:status===401?'Please open this page in a signed-in browser tab.':status===403?'This action is not allowed for your account.':status===404?'Record not found.':'The demo service is unavailable. Your saved records are unchanged; please retry.'},{status,headers:noStore});}
export async function readBody(request:Request,form=false){if(!request.headers.get('content-type')?.includes(form?'application/x-www-form-urlencoded':'application/json'))throw new Error('Expected JSON');const reader=request.body?.getReader();if(!reader)throw new Error('Missing body');let text='';let size=0;const decoder=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();throw new Error('Body too large');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return form?Object.fromEntries(new URLSearchParams(text)):JSON.parse(text);}finally{reader.releaseLock();}}
// Only approved rows are visible; owner edits reset approval in the draft API.
export async function venueCatalog(){
 const pricing=Object.fromEntries(venues.map(v=>[v.slug,defaultPricing(v)]));
 const [settings,approved]=await Promise.all([
  db().prepare('SELECT venue_slug,pricing_json FROM demo_venue_settings').all<{venue_slug:string;pricing_json:string}>(),
  db().prepare("SELECT id,data_json FROM owner_drafts WHERE status='approved_for_demo' ORDER BY updated_at DESC,id").all<{id:string;data_json:string}>()
 ]);
 for(const row of settings.results)if(pricing[row.venue_slug])pricing[row.venue_slug]=pricingSchema.parse(JSON.parse(row.pricing_json));
 const submitted=approved.results.map(row=>ownerListing(row.id,row.data_json));
 for(const item of submitted)pricing[item.venue.slug]=item.pricing;
 return {venues:[...submitted.map(item=>item.venue),...venues],pricing};
}
export async function catalogPricing(){return (await venueCatalog()).pricing;}
export async function venuePricing(slug:string){
 const v=venues.find(v=>v.slug===slug);
 if(v){const row=await db().prepare('SELECT pricing_json FROM demo_venue_settings WHERE venue_slug=?').bind(slug).first<{pricing_json:string}>();return {venue:v,pricing:row?pricingSchema.parse(JSON.parse(row.pricing_json)):defaultPricing(v),approval:undefined};}
 if(!/^owner-[0-9a-f-]{36}$/.test(slug))throw new Error('NOT_FOUND');
 const row=await db().prepare("SELECT id,data_json,updated_at FROM owner_drafts WHERE id=? AND status='approved_for_demo'").bind(slug.slice(6)).first<{id:string;data_json:string;updated_at:string}>();
 if(!row)throw new Error('NOT_FOUND');
 return {...ownerListing(row.id,row.data_json),approval:{id:row.id,dataJson:row.data_json}};
}
