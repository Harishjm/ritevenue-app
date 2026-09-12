import {z} from 'zod';
import {venueTypes,type Venue} from './venues';
import {pricingSchema} from './booking';

export const draftSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(3).max(100),locality:z.string().trim().min(2).max(100),address:z.string().trim().min(8).max(400),type:z.string().refine(v=>venueTypes.slice(1).includes(v)),capacity:z.number().int().min(1).max(2000),description:z.string().trim().min(40).max(3000),pricing:pricingSchema,images:z.array(z.string().uuid()).max(6),rightsConfirmed:z.literal(true),submit:z.boolean()}).strict();
export function ownerListing(id:string,dataJson:string){
 const d=draftSchema.parse(JSON.parse(dataJson));
 if(d.id!==id||!d.images.length)throw new Error('Invalid approved venue');
 const images=d.images.map(image=>'/api/demo/image?id='+image);
 const venue:Venue={slug:'owner-'+id,name:d.name,area:d.locality,city:'Bengaluru',address:d.address,type:d.type,capacity:d.capacity,price:d.pricing.rent/100,image:images[0],images,source:'owner',occasions:[],amenities:[],description:d.description};
 return {venue,pricing:d.pricing};
}
