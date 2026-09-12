import {env} from 'cloudflare:workers';
import {safeHttps,type VenueReference,type GoogleVenue} from './google-catalog';
// Server-only module: never import into a client component.
// Provider content stays in request memory. Only fixed diagnostic codes are logged.
const FIELD_MASK='id,displayName,formattedAddress,googleMapsUri,businessStatus,photos,attributions';
const REASONS:Record<string,string>={
 API_KEY_INVALID:'Google rejected the API key. Replace the saved secret with a valid key.',
 API_KEY_EXPIRED:'The Google API key has expired. Replace the saved secret.',
 API_KEY_HTTP_REFERRER_BLOCKED:'Google blocked this server request because the key uses website/referrer restrictions. Configure a key suitable for server-side Places API requests.',
 API_KEY_IP_ADDRESS_BLOCKED:'Google blocked this server’s IP address under the API key restrictions.',
 API_KEY_SERVICE_BLOCKED:'This key is not allowed to use Places API (New). Check its API restrictions in Google Cloud.',
 SERVICE_DISABLED:'Places API (New) is disabled for this Google Cloud project. Enable it in Google Cloud.',
 BILLING_DISABLED:'Google billing is disabled for this project. Check its linked billing account.',
 BILLING_NOT_ACTIVE:'Google billing is not active for this project. Check its linked billing account.',
 CONSUMER_INVALID:'Google rejected the project linked to this key. Check the key’s Google Cloud project.',
 RATE_LIMIT_EXCEEDED:'Google’s request quota was exceeded. Check the Places API quota before retrying.',
 QUOTA_EXCEEDED:'Google’s request quota was exceeded. Check the Places API quota before retrying.'
};
class GoogleLookupError extends Error{
 constructor(public code:string,message:string,public httpStatus=0){super(message);}
}
function diagnostic(error:unknown):GoogleLookupError{
 if(error instanceof GoogleLookupError)return error;
 if(error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError'))return new GoogleLookupError('TIMEOUT','The Google request timed out. Please retry.');
 if(error instanceof Error){
  const message=error.message;
  if(/unsupported cache|cache mode|cache.*not supported/i.test(message))return new GoogleLookupError('RUNTIME_CACHE_OPTION','The hosting runtime rejected the request’s cache option. This requires a server code fix, not a different Google key.');
  if(/illegal invocation|incorrect.*this|invalid.*this/i.test(message))return new GoogleLookupError('RUNTIME_FETCH_BINDING','The hosting runtime rejected the fetch invocation. This requires a server code fix.');
  if(/header|ByteString|invalid character/i.test(message))return new GoogleLookupError('REQUEST_HEADER_INVALID','The server could not construct the request headers. Check that the saved secret contains only the API key, with no quotes or extra text.');
  if(/fetch is not defined|AbortSignal.*not|timeout is not a function/i.test(message))return new GoogleLookupError('RUNTIME_API_UNAVAILABLE','A required request API is unavailable in the hosting runtime. This requires a server code fix.');
 }
 return new GoogleLookupError('CONNECTION_FAILED','The server could not complete its connection to Google. Please retry; if it persists, report code CONNECTION_FAILED.');
}
// Fetch exceptions occur before provider JSON is read. Redact credentials and URLs
// before recording bounded technical context, so runtime faults can be diagnosed.
function safeRuntimeError(error:unknown,key:string):string{
 if(!(error instanceof Error)||error instanceof GoogleLookupError)return '';
 return error.message.split(key).join('[redacted]').replace(/AIza[\w-]+/g,'[redacted]').replace(/https?:\/\/[^\s"'<>]+/g,'[url]').replace(/[\r\n\t]/g,' ').slice(0,240);
}
export function hasGoogleKey(){return Boolean((env as unknown as {GOOGLE_MAPS_API_KEY?:string}).GOOGLE_MAPS_API_KEY?.trim());}
export function googleKey(){const key=(env as unknown as {GOOGLE_MAPS_API_KEY?:string}).GOOGLE_MAPS_API_KEY?.trim();if(!key)throw new Error('Google connection is not configured');return key;}
async function fetchGoogle(url:string,key:string,fieldMask?:string):Promise<any>{
 // Workers supports manual/follow, but rejects redirect:'error' before any I/O.
 // Handle redirects ourselves so the API key is never forwarded to another URL.
 const response=await fetch(url,{headers:{'X-Goog-Api-Key':key,...(fieldMask?{'X-Goog-FieldMask':fieldMask}:{})},cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(10000)});
 if(response.status>=300&&response.status<400){await response.body?.cancel();throw new GoogleLookupError('UNEXPECTED_REDIRECT','Google returned an unexpected redirect. The server stopped the request to keep credentials private.',response.status);}
 if(!response.ok){
  // Never return or log Google's raw message, metadata, URLs or credentials.
  const payload:any=await response.json().catch(()=>null);
  const details=payload?.error?.details;
  const reason=Array.isArray(details)?details.find((d:any)=>d?.['@type']==='type.googleapis.com/google.rpc.ErrorInfo'&&typeof d.reason==='string'&&Object.hasOwn(REASONS,d.reason))?.reason:undefined;
  const status=response.status;
  const fallback=status===400?'Google rejected the venue request. Check the imported Place ID and request fields.':status===401?'Google could not authenticate the API key. Check the saved secret.':status===403?'Google denied access. Check Places API (New), billing and the key’s API/application restrictions in Google Cloud.':status===404?'Google could not find this Place ID. It may be outdated; rediscover this venue.':status===429?'Google’s request quota was exceeded. Check your Places API quota.':'Google returned a service error. Please retry later.';
  throw new GoogleLookupError(reason||'HTTP_'+status,reason?REASONS[reason]:fallback,status);
 }
 try{return await response.json();}catch{throw new GoogleLookupError('INVALID_RESPONSE','Google returned an unreadable response. Please retry.');}
}
export async function resolveVenue(ref:VenueReference,key:string):Promise<GoogleVenue>{
 const result:GoogleVenue={venue_uuid:ref.venue_uuid,locality:ref.locality,name:null,address:null,mapsUrl:null,businessStatus:null,photo:null,providerAttributions:[]};
 try{
 const place=await fetchGoogle('https://places.googleapis.com/v1/places/'+encodeURIComponent(ref.google_place_id)+'?languageCode=en&regionCode=IN',key,FIELD_MASK);
 if(!place||typeof place!=='object')throw new GoogleLookupError('INVALID_RESPONSE','Google returned an invalid venue response. Please retry.');
 result.name=typeof place.displayName?.text==='string'?place.displayName.text:null;
 result.address=typeof place.formattedAddress==='string'?place.formattedAddress:null;
 result.mapsUrl=safeHttps(place.googleMapsUri);
 result.businessStatus=typeof place.businessStatus==='string'?place.businessStatus:null;
 result.providerAttributions=Array.isArray(place.attributions)?place.attributions.filter((a:any)=>typeof a?.provider==='string').map((a:any)=>({name:a.provider,uri:safeHttps(a.providerUri)})):[];
 const photo=Array.isArray(place.photos)?place.photos[0]:null;
 const sourceUrl=safeHttps(photo?.googleMapsUri);
 // A fresh reference is used once; it is never persisted. Omit photos without a
 // source link so the UI can always link to the individual photo on Google Maps.
 if(photo&&sourceUrl&&typeof photo.name==='string'&&photo.name.startsWith('places/'+ref.google_place_id+'/photos/')){
  try{const media=await fetchGoogle('https://places.googleapis.com/v1/'+photo.name.split('/').map(encodeURIComponent).join('/')+'/media?maxWidthPx=800&skipHttpRedirect=true',key);
   const uri=safeHttps(media?.photoUri);const host=uri?new URL(uri).hostname:'';
   if(uri&&(host==='googleusercontent.com'||host.endsWith('.googleusercontent.com')||host.endsWith('.ggpht.com'))){
    const authors=Array.isArray(photo.authorAttributions)?photo.authorAttributions.map((a:any)=>({name:typeof a?.displayName==='string'?a.displayName:'Photo contributor',uri:safeHttps(a?.uri),photoUri:safeHttps(a?.photoUri)})):[];
    result.photo={uri,sourceUrl,authors};
   }
  }catch{/* Keep real text visible when its photo cannot be loaded. */}
 }
 return result;
 }catch(error){const issue=diagnostic(error);console.error('Google venue lookup failed',{code:issue.code,httpStatus:issue.httpStatus,runtimeDetail:safeRuntimeError(error,key)});return {...result,error:issue.message+' ('+issue.code+')'};}
}
