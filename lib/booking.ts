import {z} from 'zod';
import {indiaToday,money,type Venue} from './venues';
export const HOLD_SECONDS=2*60*60;
export const ADVANCE_PERCENT=5;
export type PackageId='marriage-24h'|'full-day'|'half-morning'|'half-evening';
export const MAX_EXTRA_HOURS=4;
export const DEFAULT_EXTRA_HOUR_PRICE=200000;
export const packages=[
 {id:'marriage-24h',name:'Standard Marriage — 24 Hours',hours:'4 PM - 4 PM (next day)'},
 {id:'full-day',name:'Full Day',hours:'8 AM - 10 PM'},
 {id:'half-morning',name:'Half Day — Morning',hours:'7 AM - 2 PM'},
 {id:'half-evening',name:'Half Day — Evening',hours:'4 PM - 11 PM'}
] as const;
export const packageIdSchema=z.enum(['marriage-24h','full-day','half-morning','half-evening']);
export const extraHoursSchema=z.number().int().min(0).max(MAX_EXTRA_HOURS).default(0);
export const addons=[{id:'suite',name:'Additional preparation room',amount:250000},{id:'storage',name:'On-site storage room',amount:150000}] as const;
const rentalPrice=z.number().int().min(10000).max(100000000);
export const pricingSchema=z.object({rent:rentalPrice,marriageRent:rentalPrice.optional(),morningRent:rentalPrice.optional(),eveningRent:rentalPrice.optional(),extraHour:z.number().int().min(0).max(10000000).default(DEFAULT_EXTRA_HOUR_PRICE),ac:z.number().int().min(0).max(10000000),generator:z.number().int().min(0).max(10000000),parking:z.number().int().min(0).max(10000000),cleaning:z.number().int().min(0).max(10000000)}).strict().transform(p=>({...p,marriageRent:p.marriageRent??p.rent,morningRent:p.morningRent??Math.max(10000,Math.round(p.rent/2)),eveningRent:p.eveningRent??Math.max(10000,Math.round(p.rent/2))}));
export type Pricing=z.infer<typeof pricingSchema>;
export function defaultPricing(v:Venue):Pricing{return pricingSchema.parse({rent:v.price*100,ac:v.amenities.includes('Air conditioning')?400000:0,generator:250000,parking:150000,cleaning:200000});}
export function packageRent(p:Pricing,id:PackageId){return id==='marriage-24h'?(p.marriageRent??p.rent):id==='half-morning'?(p.morningRent??Math.round(p.rent/2)):id==='half-evening'?(p.eveningRent??Math.round(p.rent/2)):p.rent;}
export function validDate(value:string){const d=new Date(value+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
export function lastBookableDate(){const d=new Date(indiaToday()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+365);return d.toISOString().slice(0,10);}
export const dateSchema=z.string().refine(v=>validDate(v)&&v>=indiaToday()&&v<=lastBookableDate(),'Choose a valid date within the next 12 months');
export const selectionSchema=z.object({venueSlug:z.string().min(1).max(100),date:dateSchema,guests:z.number().int().min(1).max(2000),packageId:packageIdSchema,extraHours:extraHoursSchema,addons:z.array(z.enum(['suite','storage'])).max(2).refine(v=>new Set(v).size===v.length,'Duplicate add-ons')}).strict();
export type Selection=z.infer<typeof selectionSchema>;
export type Quote={extraHourRate?:number;extraHours?:number;advancePercent?:number;startsAt?:string;endsAt?:string;venueSource?:'owner';version:1;currency:'INR';demo:true;venueSlug:string;venueName:string;locality:string;date:string;guests:number;packageId:string;packageName:string;hours:string;items:{label:string;amount:number}[];subtotal:number;tax:number;total:number;advance:number;balance:number;terms:string;createdAt:string};
export function makeQuote(v:Venue,p:Pricing,s:Selection):Quote{
 if(s.guests>v.capacity)throw new Error('Guest count exceeds this venue capacity');
 const pack=packages.find(p=>p.id===s.packageId)!;
 const items=[{label:'Base venue rental',amount:packageRent(p,s.packageId)},{label:'Air conditioning',amount:p.ac},{label:'Generator',amount:p.generator},{label:'Parking',amount:p.parking},{label:'Cleaning',amount:p.cleaning},{label:`Extra hours (${s.extraHours||0} × ${money((p.extraHour??DEFAULT_EXTRA_HOUR_PRICE)/100)})`,amount:(s.extraHours||0)*(p.extraHour??DEFAULT_EXTRA_HOUR_PRICE)},...addons.filter(a=>s.addons.includes(a.id)).map(a=>({label:a.name,amount:a.amount})),{label:'Platform fee',amount:0}];
 const subtotal=items.reduce((sum,i)=>sum+i.amount,0);const tax=Math.round(subtotal*18/100);const total=subtotal+tax;const advance=Math.round(total*ADVANCE_PERCENT/100);
 return {...bookingWindow(s.date,s.packageId,s.extraHours||0),extraHours:s.extraHours||0,extraHourRate:p.extraHour??DEFAULT_EXTRA_HOUR_PRICE,advancePercent:ADVANCE_PERCENT,...(v.source?{venueSource:v.source}:{}),version:1,currency:'INR',demo:true,venueSlug:v.slug,venueName:v.name,locality:v.area,date:s.date,guests:s.guests,packageId:pack.id,packageName:pack.name,hours:pack.hours,items,subtotal,tax,total,advance,balance:total-advance,createdAt:new Date().toISOString(),terms:'DEMONSTRATION ONLY. No money collected, no real venue reserved, no binding guarantee. The simulated quote includes all displayed mandatory charges and selected add-ons, with an illustrative 18% tax. The remaining balance is shown as payable directly to the owner, not through RiteVenue. Catering, decor, accommodation and unselected extras are not included. No later changes are permitted to this saved demo quote.'};
}
export function shiftDate(date:string,days:number){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function bookingWindow(date:string,packageId:PackageId,extraHours=0){
 const start=packageId==='marriage-24h'||packageId==='half-evening'?16:packageId==='half-morning'?7:8;
 const end=(packageId==='marriage-24h'?40:packageId==='half-evening'?23:packageId==='half-morning'?14:22)+extraHours;
 return {startsAt:date+'T'+String(start).padStart(2,'0')+':00:00+05:30',endsAt:shiftDate(date,Math.floor(end/24))+'T'+String(end%24).padStart(2,'0')+':00:00+05:30'};
}
// Old locked quotes retain the hours agreed before overnight packages were introduced.
export function savedWindow(quote:Partial<Quote>,date:string){return {startsAt:quote.startsAt||date+(quote.packageId==='extended'?'T06:00:00+05:30':'T08:00:00+05:30'),endsAt:quote.endsAt||date+(quote.packageId==='extended'?'T23:00:00+05:30':'T22:00:00+05:30')};}
export function overlaps(date:string,packageId:PackageId,slotDate:string,quote:Partial<Quote>,extraHours=0){const requested=bookingWindow(date,packageId,extraHours),saved=savedWindow(quote,slotDate);return saved.startsAt<requested.endsAt&&saved.endsAt>requested.startsAt;}
// Multiple non-overlapping bookings may share a date. One atomic write prevents overlaps.
export const holdSQL=`INSERT INTO demo_slots (venue_slug,event_date,status,hold_id,user_id,expires_at,quote_json,booking_id)
SELECT ?,?,'held',?,?,?,?,NULL WHERE NOT EXISTS (
 SELECT 1 FROM demo_slots occupied WHERE occupied.venue_slug=?
 AND (occupied.status='booked' OR (occupied.status='held' AND occupied.expires_at>?))
 AND (
 COALESCE(json_extract(occupied.quote_json,'$.startsAt'),occupied.event_date||CASE WHEN json_extract(occupied.quote_json,'$.packageId')='extended' THEN 'T06:00:00+05:30' ELSE 'T08:00:00+05:30' END)<?
 AND COALESCE(json_extract(occupied.quote_json,'$.endsAt'),occupied.event_date||CASE WHEN json_extract(occupied.quote_json,'$.packageId')='extended' THEN 'T23:00:00+05:30' ELSE 'T22:00:00+05:30' END)>?)
) RETURNING hold_id`;
export function holdBindings(slug:string,date:string,id:string,userId:string,expiresAt:number,quote:Quote,now:number,approval?:{id:string;dataJson:string}){const window=bookingWindow(date,quote.packageId as PackageId,quote.extraHours||0);return [slug,date,id,userId,expiresAt,JSON.stringify(quote),slug,now,window.endsAt,window.startsAt,...(approval?[approval.id,approval.dataJson]:[])];}
export const confirmInsertSQL=`INSERT INTO demo_bookings (id,hold_id,user_id,venue_slug,event_date,quote_json,payment_status,created_at) SELECT ?,hold_id,user_id,venue_slug,event_date,quote_json,'simulated',? FROM demo_slots WHERE hold_id=? AND user_id=? AND status='held' AND expires_at>? ON CONFLICT(hold_id) DO NOTHING`;
export const confirmSlotSQL=`UPDATE demo_slots SET status='booked',booking_id=(SELECT id FROM demo_bookings WHERE hold_id=?),expires_at=NULL WHERE hold_id=? AND user_id=? AND status='held' AND EXISTS (SELECT 1 FROM demo_bookings WHERE hold_id=?)`;

// Recheck approval and the exact reviewed payload in the same statement as the hold.
export const ownerHoldSQL=holdSQL.replace(" RETURNING hold_id", " AND EXISTS (SELECT 1 FROM owner_drafts WHERE id=? AND status='approved_for_demo' AND data_json=?) RETURNING hold_id");
