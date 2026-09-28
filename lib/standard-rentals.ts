import {z} from 'zod';

export const rentalKeys=['rent','marriageRent','morningRent','eveningRent'] as const;
export type RentalKey=typeof rentalKeys[number];
export const rentalLabels:Record<RentalKey,string>={rent:'Full Day',marriageRent:'24-hour Marriage',morningRent:'Half Day Morning',eveningRent:'Half Day Evening'};
const packageStatus=z.enum(['available','price_on_request','not_applicable','not_available']);
export const packageAvailabilitySchema=z.object({rent:packageStatus.default('available'),marriageRent:packageStatus.default('available'),morningRent:packageStatus.default('available'),eveningRent:packageStatus.default('available')}).strict().default({});
export type PackageAvailability=z.infer<typeof packageAvailabilitySchema>;

const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'Enter a valid time.');
const slot=z.object({start:time,end:time,nextDay:z.boolean()}).strict();
export const defaultPackageTimings={rent:{start:'08:00',end:'22:00',nextDay:false},marriageRent:{start:'16:00',end:'16:00',nextDay:true},morningRent:{start:'07:00',end:'14:00',nextDay:false},eveningRent:{start:'16:00',end:'23:00',nextDay:false}};
// Drafts can retain a temporarily incomplete interval while the owner edits it.
export const packageTimingsSchema=z.object({rent:slot.default(defaultPackageTimings.rent),marriageRent:slot.default(defaultPackageTimings.marriageRent),morningRent:slot.default(defaultPackageTimings.morningRent),eveningRent:slot.default(defaultPackageTimings.eveningRent)}).strict().default({});
export type PackageTimings=z.infer<typeof packageTimingsSchema>;
export function validPackageTiming(value:PackageTimings[RentalKey]){
 const minutes=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
 const duration=minutes(value.end)-minutes(value.start)+(value.nextDay?1440:0);
 return duration>0&&duration<=1440;
}
export function hasCustomPackageTimings(value:PackageTimings){return rentalKeys.some(key=>{const a=value[key],b=defaultPackageTimings[key];return a.start!==b.start||a.end!==b.end||a.nextDay!==b.nextDay;});}
export function packageTimeLabel(value:PackageTimings[RentalKey]){
 const label=(s:string)=>{const h=Number(s.slice(0,2)),m=s.slice(3);return `${h%12||12}${m==='00'?'':':'+m} ${h<12?'AM':'PM'}`;};
 return `${label(value.start)} to ${label(value.end)}${value.nextDay?' next day':''}`;
}

const rentalAmount=z.number().int().min(0).max(100000000).nullable();
const charge=z.number().int().min(0).max(10000000);
// Listing prices are independent from booking quotes: null is not a free rental.
export const listingPricingSchema=z.object({rent:rentalAmount,marriageRent:rentalAmount.optional(),morningRent:rentalAmount.optional(),eveningRent:rentalAmount.optional(),extraHour:charge.default(200000),ac:charge,generator:charge,parking:charge,cleaning:charge}).strict().transform(p=>({...p,
 marriageRent:p.marriageRent===undefined?p.rent:p.marriageRent,
 morningRent:p.morningRent===undefined?(p.rent===null?null:Math.max(10000,Math.round(p.rent/2))):p.morningRent,
 eveningRent:p.eveningRent===undefined?(p.rent===null?null:Math.max(10000,Math.round(p.rent/2))):p.eveningRent
}));
export type ListingPricing=z.infer<typeof listingPricingSchema>;
export function pricingForAvailability(pricing:ListingPricing,availability:PackageAvailability):ListingPricing{
 const next={...pricing};for(const key of rentalKeys)if(availability[key]==='price_on_request')next[key]=null;return next;
}
export function rentalPriceLabel(status:PackageAvailability[RentalKey],amount:number|null){
 if(status==='not_applicable')return 'Not applicable';
 if(status==='not_available')return 'Not available';
 if(status==='price_on_request'||amount===null)return 'Price on request';
 return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(amount/100);
}
