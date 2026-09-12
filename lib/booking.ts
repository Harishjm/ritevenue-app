import {z} from 'zod';
import {indiaToday,type Venue} from './venues';
export const HOLD_SECONDS=2*60*60;
export const packages=[{id:'full-day',name:'Full day',hours:'08:00 - 22:00',extra:0},{id:'extended',name:'Extended day',hours:'06:00 - 23:00',extra:600000}] as const;
export const addons=[{id:'suite',name:'Additional preparation room',amount:250000},{id:'storage',name:'On-site storage room',amount:150000}] as const;
export const pricingSchema=z.object({rent:z.number().int().min(10000).max(100000000),ac:z.number().int().min(0).max(10000000),generator:z.number().int().min(0).max(10000000),parking:z.number().int().min(0).max(10000000),cleaning:z.number().int().min(0).max(10000000)}).strict();
export type Pricing=z.infer<typeof pricingSchema>;
export function defaultPricing(v:Venue):Pricing{return {rent:v.price*100,ac:v.amenities.includes('Air conditioning')?400000:0,generator:250000,parking:150000,cleaning:200000};}
export function validDate(value:string){const d=new Date(value+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
export function lastBookableDate(){const d=new Date(indiaToday()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+365);return d.toISOString().slice(0,10);}
export const dateSchema=z.string().refine(v=>validDate(v)&&v>=indiaToday()&&v<=lastBookableDate(),'Choose a valid date within the next 12 months');
export const selectionSchema=z.object({venueSlug:z.string().min(1).max(100),date:dateSchema,guests:z.number().int().min(1).max(2000),packageId:z.enum(['full-day','extended']),addons:z.array(z.enum(['suite','storage'])).max(2).refine(v=>new Set(v).size===v.length,'Duplicate add-ons')}).strict();
export type Selection=z.infer<typeof selectionSchema>;
export type Quote={venueSource?:'owner';version:1;currency:'INR';demo:true;venueSlug:string;venueName:string;locality:string;date:string;guests:number;packageId:string;packageName:string;hours:string;items:{label:string;amount:number}[];subtotal:number;tax:number;total:number;advance:number;balance:number;terms:string;createdAt:string};
export function makeQuote(v:Venue,p:Pricing,s:Selection):Quote{
 if(s.guests>v.capacity)throw new Error('Guest count exceeds this venue capacity');
 const pack=packages.find(p=>p.id===s.packageId)!;
 const items=[{label:'Base venue rental',amount:p.rent},{label:'Air conditioning',amount:p.ac},{label:'Generator',amount:p.generator},{label:'Parking',amount:p.parking},{label:'Cleaning',amount:p.cleaning},{label:'Extended access',amount:pack.extra},...addons.filter(a=>s.addons.includes(a.id)).map(a=>({label:a.name,amount:a.amount})),{label:'Platform fee',amount:0}];
 const subtotal=items.reduce((sum,i)=>sum+i.amount,0);const tax=Math.round(subtotal*18/100);const total=subtotal+tax;const advance=Math.round(total/4);
 return {...(v.source?{venueSource:v.source}:{}),version:1,currency:'INR',demo:true,venueSlug:v.slug,venueName:v.name,locality:v.area,date:s.date,guests:s.guests,packageId:pack.id,packageName:pack.name,hours:pack.hours,items,subtotal,tax,total,advance,balance:total-advance,createdAt:new Date().toISOString(),terms:'DEMONSTRATION ONLY. No money collected, no real venue reserved, no binding guarantee. The simulated quote includes all displayed mandatory charges and selected add-ons, with an illustrative 18% tax. The remaining balance is shown as payable directly to the owner, not through RiteVenue. Catering, decor, accommodation and unselected extras are not included. No later changes are permitted to this saved demo quote.'};
}
// A single row owns each venue/date. Expired holds are available without a cron job.
export const holdSQL=`INSERT INTO demo_slots (venue_slug,event_date,status,hold_id,user_id,expires_at,quote_json,booking_id) VALUES (?,?,'held',?,?,?,?,NULL) ON CONFLICT(venue_slug,event_date) DO UPDATE SET status='held',hold_id=excluded.hold_id,user_id=excluded.user_id,expires_at=excluded.expires_at,quote_json=excluded.quote_json,booking_id=NULL WHERE demo_slots.status='available' OR (demo_slots.status='held' AND demo_slots.expires_at<=?) RETURNING hold_id`;
export const confirmInsertSQL=`INSERT INTO demo_bookings (id,hold_id,user_id,venue_slug,event_date,quote_json,payment_status,created_at) SELECT ?,hold_id,user_id,venue_slug,event_date,quote_json,'simulated',? FROM demo_slots WHERE hold_id=? AND user_id=? AND status='held' AND expires_at>? ON CONFLICT(hold_id) DO NOTHING`;
export const confirmSlotSQL=`UPDATE demo_slots SET status='booked',booking_id=(SELECT id FROM demo_bookings WHERE hold_id=?),expires_at=NULL WHERE hold_id=? AND user_id=? AND status='held' AND EXISTS (SELECT 1 FROM demo_bookings WHERE hold_id=?)`;

// Recheck approval and the exact reviewed payload in the same statement as the hold.
export const ownerHoldSQL=holdSQL.replace("VALUES (?,?,'held',?,?,?,?,NULL)","SELECT ?,?,'held',?,?,?,?,NULL WHERE EXISTS (SELECT 1 FROM owner_drafts WHERE id=? AND status='approved_for_demo' AND data_json=?)");
