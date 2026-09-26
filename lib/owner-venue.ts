import {publicationSchema} from './publication';
import {policySchema} from './catering';
import {z} from 'zod';
import {venueTypes,type Venue} from './venues';
import {pricingSchema} from './booking';
import {rentalDetailsSchema,emptyLegacyPricing} from './venue-offers';
const packageStatus=z.enum(['available','not_applicable','not_available']);
export const packageAvailabilitySchema=z.object({rent:packageStatus.default('available'),marriageRent:packageStatus.default('available'),morningRent:packageStatus.default('available'),eveningRent:packageStatus.default('available')}).strict().default({});
export type PackageAvailability=z.infer<typeof packageAvailabilitySchema>;
export const packagePriceKey={'full-day':'rent','marriage-24h':'marriageRent','half-morning':'morningRent','half-evening':'eveningRent'} as const;

const noLegacyPricing=z.object({rent:z.literal(0),marriageRent:z.literal(0),morningRent:z.literal(0),eveningRent:z.literal(0),extraHour:z.literal(0),ac:z.literal(0),generator:z.literal(0),parking:z.literal(0),cleaning:z.literal(0)}).strict();
export const draftSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(3).max(100),city:z.string().trim().min(2).max(100).default('Bengaluru'),locality:z.string().trim().min(2).max(100),address:z.string().trim().min(8).max(400),type:z.string().refine(v=>venueTypes.slice(1).includes(v)),capacity:z.number().int().min(1).max(50000),description:z.string().trim().min(40).max(3000),pricing:z.union([pricingSchema,noLegacyPricing]).optional(),rentalDetails:rentalDetailsSchema.nullable().default(null),packageAvailability:packageAvailabilitySchema,images:z.array(z.string().uuid()).max(15).refine(ids=>new Set(ids).size===ids.length,'Use each venue photo only once.'),cateringPolicy:policySchema.default({}),publication:publicationSchema.default({}),rightsConfirmed:z.boolean(),submit:z.boolean()}).strict().refine(d=>!!d.rentalDetails||!!d.pricing&&d.pricing.rent>0,'Enter standard pricing or use flexible rental offers.').refine(d=>!d.submit||d.rightsConfirmed,'Confirm that you are authorized to provide these details and images.').transform(d=>({...d,pricing:d.rentalDetails?{...emptyLegacyPricing}:d.pricing!,packageAvailability:d.rentalDetails?{rent:'not_applicable' as const,marriageRent:'not_applicable' as const,morningRent:'not_applicable' as const,eveningRent:'not_applicable' as const}:d.packageAvailability}));
export function ownerListing(id:string,dataJson:string){
 const d=draftSchema.parse(JSON.parse(dataJson));
 if(d.id!==id||!d.images.length)throw new Error('Invalid approved venue');
 const images=d.images.map(image=>'/api/demo/image?id='+image);
 const venue:Venue={cateringPolicy:d.cateringPolicy,slug:'owner-'+id,name:d.name,area:d.locality,city:d.city,address:d.address,type:d.type,capacity:d.capacity,price:d.pricing.rent/100,packageAvailability:d.packageAvailability,image:images[0],images,source:'owner',occasions:[],amenities:[],description:d.description};
 return {venue,pricing:d.pricing,bookable:!d.rentalDetails};
}
