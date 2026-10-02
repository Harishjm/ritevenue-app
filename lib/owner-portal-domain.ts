import {z} from 'zod';
import {draftSchema,packageAvailabilitySchema} from './owner-venue';
import {publicationSchema} from './publication';
import {policySchema} from './catering';
import {capacityDetailsSchema} from './venue-capacity';
import {emptyLegacyPricing,rentalDetailsSchema} from './venue-offers';
import {listingPricingSchema,packageTimingsSchema,pricingForAvailability} from './standard-rentals';
import {venuePoliciesSchema} from './venue-policies';

// Saving an incomplete draft is allowed. Submission uses the full listing schema.
export const workingVenueSchema=z.object({
 name:z.string().max(100).default(''),city:z.string().max(100).default('Bengaluru'),
 locality:z.string().max(100).default(''),address:z.string().max(400).default(''),
 type:z.string().max(40).default('Wedding hall'),capacity:z.number().int().min(1).max(50000).nullable().default(null),
 capacityDetails:capacityDetailsSchema.nullable().default(null),description:z.string().max(3000).default(''),policies:venuePoliciesSchema,
 contactName:z.string().max(100).default(''),phone:z.string().max(30).default(''),
 pricing:listingPricingSchema.default({...emptyLegacyPricing}),
 rentalDetails:z.union([z.object({version:z.literal(2),text:z.string().max(5000)}).strict(),rentalDetailsSchema]).nullable().default({version:2,text:''}),
 packageAvailability:packageAvailabilitySchema,packageTimings:packageTimingsSchema,cateringPolicy:policySchema.default({}),publication:publicationSchema.default({}),
 images:z.array(z.string().uuid()).max(15).refine(a=>new Set(a).size===a.length,'Each photo can only be used once.').default([]),
 rightsConfirmed:z.boolean().default(false)
}).strict().transform(d=>({...d,pricing:pricingForAvailability(d.pricing,d.packageAvailability)}));
export type WorkingVenue=z.infer<typeof workingVenueSchema>;
export const newWorkingVenue=()=>workingVenueSchema.parse({});
export function importedWorkingVenue(value:unknown){
 const {id,submit,...data}=draftSchema.parse(value);
 return workingVenueSchema.parse(data);
}
export function submissionVenue(id:string,data:WorkingVenue){
 if(data.contactName.trim().length<2||!/^\+?[0-9 ()-]{8,24}$/.test(data.phone)||data.phone.replace(/\D/g,'').length<8)throw new Error('Add a contact name and valid phone number.');
 if(data.images.length<2)throw new Error('Add at least two venue photos.');
 if(!data.publication.consent)throw new Error('Confirm permission to publish this venue.');
 const {contactName,phone,...listing}=data;
 const pricing=listing.rentalDetails?{...emptyLegacyPricing}:{...listing.pricing};
 return draftSchema.parse({...listing,id,pricing,submit:true});
}
export const ownerStatusLabels:Record<string,string>={draft:'Draft',pending_review:'Under review',changes_requested:'Changes requested',published:'Published',rejected:'Rejected'};
