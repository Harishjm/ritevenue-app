import {z} from 'zod';

export const MAX_VENUE_GUESTS=50000;
const guests=z.number().int().min(1,'Enter at least one guest.').max(MAX_VENUE_GUESTS);
export const capacityDetailsSchema=z.object({
 minimum:guests.nullable().default(null),
 seated:guests.nullable().default(null),
 floating:guests.nullable().default(null),
}).strict();
export type CapacityDetails=z.infer<typeof capacityDetailsSchema>;
export const emptyCapacityDetails=():CapacityDetails=>({minimum:null,seated:null,floating:null});

export function validateCapacity(value:{capacity:number;capacityDetails?:CapacityDetails|null},ctx:z.RefinementCtx){
 if(!value.capacityDetails)return;
 for(const key of ['minimum','seated','floating'] as const){
  const count=value.capacityDetails[key];
  if(count!==null&&count>value.capacity)ctx.addIssue({code:'custom',path:['capacityDetails',key],message:key==='minimum'?'Minimum guests cannot exceed maximum guests.':`${key==='seated'?'Seated':'Floating'} capacity cannot exceed maximum guests. Update the maximum if needed.`});
 }
}

export function capacityLabel(capacity:number,details?:CapacityDetails|null){
 const maximum=capacity.toLocaleString('en-IN');
 return details?.minimum?`${details.minimum.toLocaleString('en-IN')}–${maximum} guests`:`Up to ${maximum} guests`;
}
