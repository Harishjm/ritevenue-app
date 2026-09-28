import {publicationSchema} from './publication';
import {policySchema} from './catering';
import {z} from 'zod';
import {venueTypes,type Venue} from './venues';
import {pricingSchema} from './booking';
import {rentalDetailsSchema,emptyLegacyPricing} from './venue-offers';
import {capacityDetailsSchema,validateCapacity} from './venue-capacity';
import {packageAvailabilitySchema,packageTimingsSchema,listingPricingSchema,rentalKeys,rentalLabels,validPackageTiming,hasCustomPackageTimings,pricingForAvailability} from './standard-rentals';
export {packageAvailabilitySchema,type PackageAvailability} from './standard-rentals';
export const packagePriceKey={'full-day':'rent','marriage-24h':'marriageRent','half-morning':'morningRent','half-evening':'eveningRent'} as const;

const listingSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(3).max(100),city:z.string().trim().min(2).max(100).default('Bengaluru'),locality:z.string().trim().min(2).max(100),address:z.string().trim().min(8).max(400),type:z.string().refine(v=>venueTypes.slice(1).includes(v)),capacity:z.number().int().min(1).max(50000),capacityDetails:capacityDetailsSchema.nullable().default(null),description:z.string().trim().min(40).max(3000),pricing:listingPricingSchema,rentalDetails:rentalDetailsSchema.nullable().default(null),packageAvailability:packageAvailabilitySchema,packageTimings:packageTimingsSchema,images:z.array(z.string().uuid()).max(15).refine(ids=>new Set(ids).size===ids.length,'Use each venue photo only once.'),cateringPolicy:policySchema.default({}),publication:publicationSchema.default({}),rightsConfirmed:z.boolean(),submit:z.boolean()}).strict().superRefine(validateCapacity).superRefine((d,ctx)=>{
 if(d.rentalDetails)return;
 for(const key of rentalKeys){
  const status=d.packageAvailability[key],amount=d.pricing[key];
  if(status==='available'&&(amount===null||amount<10000))ctx.addIssue({code:'custom',path:['pricing',key],message:`${rentalLabels[key]}: enter a rental of at least ₹100, or select Available — price on request.`});
  if((status==='available'||status==='price_on_request')&&!validPackageTiming(d.packageTimings[key]))ctx.addIssue({code:'custom',path:['packageTimings',key],message:`${rentalLabels[key]}: the end must be after the start, within 24 hours. Choose next day for an overnight slot.`});
 }
}).refine(d=>!d.submit||d.rightsConfirmed,'Confirm that you are authorized to provide these details and images.').transform(d=>({...d,pricing:d.rentalDetails?{...emptyLegacyPricing}:pricingForAvailability(d.pricing,d.packageAvailability),packageAvailability:d.rentalDetails?{rent:'not_applicable' as const,marriageRent:'not_applicable' as const,morningRent:'not_applicable' as const,eveningRent:'not_applicable' as const}:d.packageAvailability}));
// Custom venue details replace standard pricing. Clear hidden legacy values before
// validating, including placeholders left by switching package availability.
export const draftSchema=z.preprocess(value=>{
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  const input=value as Record<string,unknown>;
  if(rentalDetailsSchema.safeParse(input.rentalDetails).success)return {...input,pricing:{...emptyLegacyPricing}};
 }
 return value;
},listingSchema);

export function ownerListing(id:string,dataJson:string){
 const d=draftSchema.parse(JSON.parse(dataJson));
 if(d.id!==id||!d.images.length)throw new Error('Invalid approved venue');
 const images=d.images.map(image=>'/api/demo/image?id='+image);
 const venue:Venue={cateringPolicy:d.cateringPolicy,slug:'owner-'+id,name:d.name,area:d.locality,city:d.city,address:d.address,type:d.type,capacity:d.capacity,capacityDetails:d.capacityDetails,price:(d.pricing.rent??0)/100,packageAvailability:d.packageAvailability,image:images[0],images,source:'owner',occasions:[],amenities:[],description:d.description};
 // The private prototype quote engine only supports its fixed, fully priced slots.
 // Discovery listings with unquoted prices/custom times must never enter it.
 const quotePricing=pricingSchema.safeParse(d.pricing);
 return {venue,pricing:quotePricing.success?quotePricing.data:null,bookable:!d.rentalDetails&&quotePricing.success&&!hasCustomPackageTimings(d.packageTimings)};
}
