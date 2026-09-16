import {z} from 'zod';
export const intakeSchema=z.object({
 requestKey:z.string().uuid(),venueName:z.string().trim().min(3).max(120),
 locality:z.string().trim().min(2).max(120),contactName:z.string().trim().min(2).max(100),
 email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),
 phone:z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/,'Enter a valid contact number'),
 capacity:z.number().int().min(1).max(50000),
 notes:z.string().trim().max(2000).default(''),consent:z.literal(true),
 website:z.string().max(200).default('')
}).strict();
export const intakeHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
