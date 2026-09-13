import {db} from './db';
import {overlaps,shiftDate,type Quote,type PackageId} from './booking';
export type CalendarDay={date:string;status:'held'|'booked';expiresAt:number;ownHold?:{id:string;quote:Quote}};
export type CalendarSnapshot={month:string;packageId:PackageId;extraHours:number;serverTime:number;days:CalendarDay[]};
type Slot={venue_slug:string;event_date:string;status:'held'|'booked';expires_at:number;user_id:string;hold_id:string;quote_json:string};
const active="(status='booked' OR (status='held' AND expires_at>?))";
export async function unavailableVenues(date:string,packageId:PackageId='marriage-24h',extraHours=0){
 const rows=await db().prepare(`SELECT venue_slug,event_date,quote_json FROM demo_slots WHERE event_date>=? AND event_date<=? AND ${active}`).bind(shiftDate(date,-1),shiftDate(date,1),Math.floor(Date.now()/1000)).all<Slot>();
 return [...new Set(rows.results.filter(r=>overlaps(date,packageId,r.event_date,JSON.parse(r.quote_json),extraHours)).map(r=>r.venue_slug))];
}
export async function calendarSnapshot(slug:string,month:string,userId:string,packageId:PackageId='marriage-24h',extraHours=0):Promise<CalendarSnapshot>{
 const now=Math.floor(Date.now()/1000);const [y,m]=month.split('-').map(Number);const count=new Date(Date.UTC(y,m,0)).getUTCDate();const first=month+'-01';const last=month+'-'+String(count).padStart(2,'0');
 const rows=await db().prepare(`SELECT venue_slug,event_date,status,expires_at,user_id,hold_id,quote_json FROM demo_slots WHERE venue_slug=? AND event_date>=? AND event_date<=? AND ${active}`).bind(slug,shiftDate(first,-1),shiftDate(last,1),now).all<Slot>();
 const parsed=rows.results.map(r=>({...r,quote:JSON.parse(r.quote_json) as Quote}));const days:CalendarDay[]=[];
 for(let n=1;n<=count;n++){
  const date=month+'-'+String(n).padStart(2,'0');const conflicts=parsed.filter(r=>overlaps(date,packageId,r.event_date,r.quote,extraHours));if(!conflicts.length)continue;
  const booked=conflicts.some(r=>r.status==='booked');const own=conflicts.find(r=>r.event_date===date&&r.quote.packageId===packageId&&r.user_id===userId&&r.status==='held');
  days.push({date,status:booked?'booked':'held',expiresAt:booked?0:Math.max(...conflicts.map(r=>r.expires_at)),...(!booked&&own?{ownHold:{id:own.hold_id,quote:own.quote}}:{})});
 }
 return {month,packageId,extraHours,serverTime:now,days};
}
