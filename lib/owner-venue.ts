import {publicationSchema} from './publication';
import {policySchema} from './catering';
import {z} from 'zod';
import {venueTypes,type Venue} from './venues';
import {pricingSchema} from './booking';

export const draftSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(3).max(100),locality:z.string().trim().min(2).max(100),address:z.string().trim().min(8).max(400),type:z.string().refine(v=>venueTypes.slice(1).includes(v)),capacity:z.number().int().min(1).max(50000),description:z.string().trim().min(40).max(3000),pricing:pricingSchema,images:z.array(z.string().uuid()).max(6),cateringPolicy:policySchema.default({}),publication:publicationSchema.default({}),rightsConfirmed:z.boolean(),submit:z.boolean()}).strict().refine(d=>!d.submit||d.rightsConfirmed,'Confirm that you are authorized to provide these details and images.');
export function ownerListing(id:string,dataJson:string){
 const d=draftSchema.parse(JSON.parse(dataJson));
 if(d.id!==id||!d.images.length)throw new Error('Invalid approved venue');
 const images=d.images.map(image=>'/api/demo/image?id='+image);
 const venue:Venue={cateringPolicy:d.cateringPolicy,slug:'owner-'+id,name:d.name,area:d.locality,city:'Bengaluru',address:d.address,type:d.type,capacity:d.capacity,price:d.pricing.rent/100,image:images[0],images,source:'owner',occasions:[],amenities:[],description:d.description};
 return {venue,pricing:d.pricing};
}
