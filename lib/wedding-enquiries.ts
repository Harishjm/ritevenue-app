import {z} from 'zod';

export const foodOptions={vegetarian:'Vegetarian',non_vegetarian:'Non-vegetarian',both:'Both',undecided:'Not decided yet'} as const;
export const helpOptions={venue:'Venue only',venue_catering:'Venue & catering',complete:'Complete wedding planning'} as const;
export const plannerOptions={yes:'Yes',no:'No',undecided:'Help me decide'} as const;
export const budgetOptions={under_5:'Under ₹5 lakh',from_5_10:'₹5–10 lakh',from_10_20:'₹10–20 lakh',from_20_40:'₹20–40 lakh',above_40:'Above ₹40 lakh',undecided:'Need guidance'} as const;
export const enquiryStatuses={new:'New',contacted:'Contacted',requirements_confirmed:'Requirements confirmed',options_shared:'Options shared',booked:'Booked',closed:'Closed'} as const;
export const ENQUIRY_CONSENT_VERSION='wedding-assistance-v1';

export function planningToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function validDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
const trackingValue=z.string().trim().max(100).regex(/^[a-zA-Z0-9 _.-]*$/).default('');
export const weddingEnquirySchema=z.object({
 requestKey:z.string().uuid(),
 location:z.string().trim().min(2,'Tell us a locality, or choose “Help me choose”.').max(200),
 datePreference:z.enum(['exact','month','flexible']),
 eventDate:z.string().max(10).default(''),eventMonth:z.string().max(7).default(''),
 guests:z.number().int().min(1,'Enter an approximate guest count.').max(50000),
 food:z.enum(['vegetarian','non_vegetarian','both','undecided']),
 help:z.enum(['venue','venue_catering','complete']),planner:z.enum(['yes','no','undecided']),
 budget:z.enum(['under_5','from_5_10','from_10_20','from_20_40','above_40','undecided']),
 budgetScope:z.enum(['venue','whole_wedding']),
 name:z.string().trim().min(2,'Enter your name.').max(100),
 phone:z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/,'Enter a valid phone number.').transform(value=>value.replace(/[ ()-]/g,'')).refine(value=>/^\+?\d{8,15}$/.test(value),'Enter a valid phone number.'),
 email:z.union([z.string().trim().email().max(254),z.literal('')]).default('').transform(value=>value.toLowerCase()),
 contactMethod:z.enum(['phone','whatsapp']),
 notes:z.string().trim().max(2000).default(''),
 consent:z.literal(true,{errorMap:()=>({message:'Please allow us to contact you about this enquiry.'})}),
 source:trackingValue,medium:trackingValue,campaign:trackingValue,
 website:z.string().max(200).default('')
}).strict().superRefine((value,ctx)=>{
 const today=planningToday(),maxYear=Number(today.slice(0,4))+5;
 if(value.datePreference==='exact'&&(!validDate(value.eventDate)||value.eventDate<today||Number(value.eventDate.slice(0,4))>maxYear))ctx.addIssue({code:'custom',path:['eventDate'],message:'Choose a valid upcoming wedding date within five years.'});
 if(value.datePreference==='month'&&(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value.eventMonth)||value.eventMonth<today.slice(0,7)||Number(value.eventMonth.slice(0,4))>maxYear))ctx.addIssue({code:'custom',path:['eventMonth'],message:'Choose an upcoming month within five years.'});
 if(value.datePreference!=='exact'&&value.eventDate)ctx.addIssue({code:'custom',path:['eventDate'],message:'Remove the exact date when choosing a flexible date.'});
 if(value.datePreference!=='month'&&value.eventMonth)ctx.addIssue({code:'custom',path:['eventMonth'],message:'Remove the month when choosing another date preference.'});
});

export const enquiryUpdateSchema=z.object({
 id:z.string().uuid(),expectedRevision:z.string().uuid(),
 status:z.enum(['new','contacted','requirements_confirmed','options_shared','booked','closed']),
 coordinator:z.string().trim().max(100),
 followUpOn:z.string().max(10).refine(value=>!value||validDate(value),'Choose a valid follow-up date.'),
 note:z.string().trim().min(5,'Add a short note explaining this update.').max(2000)
}).strict();

export type WeddingEnquiryData=Omit<z.infer<typeof weddingEnquirySchema>,'requestKey'|'website'>;
export type EnquiryStatus=keyof typeof enquiryStatuses;
export type EnquiryRow={id:string;data:WeddingEnquiryData;status:EnquiryStatus;coordinator:string;followUpOn:string;revision:string;createdAt:string;updatedAt:string;consentVersion:string};
export type EnquiryEvent={id:string;status:EnquiryStatus;note:string;coordinator:string;follow_up_on:string;created_at:string};
