const encoder=new TextEncoder();

export const OTP_TTL_SECONDS=10*60;
export const OTP_MAX_ATTEMPTS=5;
export const SESSION_TTL_SECONDS=12*60*60;
export const AUTH_COOKIE='rv_session';

export function normalizeEmail(value:string){return value.trim().toLowerCase();}

export function safeReturnPath(value:string|null|undefined){
 if(!value?.startsWith('/')||value.startsWith('//'))return '/admin';
 try{const url=new URL(value,'https://app.local');if(url.origin!=='https://app.local'||url.pathname==='/admin/sign-in')return '/admin';return `${url.pathname}${url.search}${url.hash}`;}catch{return '/admin';}
}

export function randomOtp(){
 const ceiling=Math.floor(0x100000000/1000000)*1000000;
 const values=new Uint32Array(1);let value=ceiling;
 while(value>=ceiling){crypto.getRandomValues(values);value=values[0];}
 return String(value%1000000).padStart(6,'0');
}

export function randomToken(bytes=32){const value=new Uint8Array(bytes);crypto.getRandomValues(value);return base64Url(value);}

export async function sha256(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));}

async function hmacKey(secret:string,usage:KeyUsage[]){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,usage);}

export async function otpHash(secret:string,challengeId:string,email:string,code:string){const key=await hmacKey(secret,['sign']);return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(`${challengeId}\n${email}\n${code}`))));}

export async function verifyOtpHash(secret:string,challengeId:string,email:string,code:string,expectedHex:string){
 if(!/^[0-9a-f]{64}$/.test(expectedHex))return false;
 const key=await hmacKey(secret,['verify']);
 return crypto.subtle.verify('HMAC',key,unhex(expectedHex),encoder.encode(`${challengeId}\n${email}\n${code}`));
}

export function readCookie(cookieHeader:string|null,name=AUTH_COOKIE){for(const part of (cookieHeader||'').split(';')){const [key,...value]=part.trim().split('=');if(key===name)return value.join('=');}return null;}

export function sessionCookie(token:string,secure:boolean,maxAge=SESSION_TTL_SECONDS){return `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`;}
export function clearSessionCookie(secure:boolean){return `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`;}

function base64Url(value:Uint8Array){let binary='';for(const byte of value)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function hex(value:Uint8Array){return Array.from(value,b=>b.toString(16).padStart(2,'0')).join('');}
function unhex(value:string){const result=new Uint8Array(value.length/2);for(let i=0;i<result.length;i++)result[i]=Number.parseInt(value.slice(i*2,i*2+2),16);return result;}
