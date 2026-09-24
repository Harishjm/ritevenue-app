import {z} from 'zod';

const phone=z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/).transform(value=>value.replace(/[ ()-]/g,''));
const email=z.string().trim().email().max(254).transform(value=>value.toLowerCase());
export const venueEnquirySchema=z.object({
 requestKey:z.string().uuid(),venueSlug:z.string().trim().min(1).max(160),eventDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),name:z.string().trim().min(2).max(100),phone:phone.optional().default(''),email:email.optional().default(''),consent:z.literal(true),website:z.string().max(200).default('')
}).strict().superRefine((value,ctx)=>{if(!value.phone&&!value.email)ctx.addIssue({code:'custom',path:['phone'],message:'Enter a phone number or email address.'});});
export const VENUE_ENQUIRY_CONSENT_VERSION='venue-calendar-enquiry-v1';