import {z} from 'zod';
import {validDate,shiftDate} from './booking';
import {indiaToday} from './venues';
const date=z.string().refine(validDate,'Use a valid calendar date');
export const publicationSchema=z.object({consent:z.boolean().default(false),calendarUpdatedAt:z.string().datetime().nullable().default(null),calendar:z.object({from:date,to:date,unavailable:z.array(date).max(366).default([])}).strict().refine(c=>c.to>=c.from&&c.to<=shiftDate(c.from,365),'Calendar range must cover at most 12 months').refine(c=>c.unavailable.every(d=>d>=c.from&&d<=c.to),'Unavailable dates must be within the stated range').nullable().default(null)}).strict();
export type Publication=z.infer<typeof publicationSchema>;
export function publicDateStatus(calendar:Publication['calendar'],day:string,updatedAt:string){if(!validDate(day)||day<indiaToday())return 'past';if(!calendar||!Number.isFinite(Date.parse(updatedAt))||day<calendar.from||day>calendar.to||Date.parse(updatedAt)<Date.now()-7*86400000)return 'unconfirmed';return calendar.unavailable.includes(day)?'unavailable':'available';}
