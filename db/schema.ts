import {sqliteTable,text,integer,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const intakePhotos=sqliteTable('intake_photos',{id:text('id').primaryKey(),intakeId:text('intake_id').notNull().references(()=>publicVenueIntakes.id),position:integer('position').notNull(),objectKey:text('object_key').notNull(),description:text('description').notNull(),width:integer('width').notNull(),height:integer('height').notNull(),bytes:integer('bytes').notNull(),sha256:text('sha256').notNull()},t=>[uniqueIndex('idx_intake_photo_position').on(t.intakeId,t.position)]);
export const authGoogleFlows=sqliteTable('auth_google_flows',{id:text('id').primaryKey(),browserHash:text('browser_hash').notNull(),nonce:text('nonce').notNull(),returnTo:text('return_to').notNull(),expiresAt:integer('expires_at').notNull()},t=>[index('idx_auth_google_flow_expiry').on(t.expiresAt)]);
export const authGoogleIdentities=sqliteTable('auth_google_identities',{email:text('email').primaryKey(),subject:text('subject').notNull().unique()});
// Private planning enquiries are independent of listings, inventory and payments.
export const weddingEnquiries=sqliteTable('wedding_enquiries',{
 id:text('id').primaryKey(),requestKey:text('request_key').notNull().unique(),payloadHash:text('payload_hash').notNull(),
 dataJson:text('data_json').notNull(),status:text('status').notNull().default('new'),coordinator:text('coordinator').notNull().default(''),
 followUpOn:text('follow_up_on').notNull().default(''),revision:text('revision').notNull(),consentVersion:text('consent_version').notNull(),
 createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
},t=>[index('idx_wedding_enquiry_created').on(t.createdAt,t.id),index('idx_wedding_enquiry_status_created').on(t.status,t.createdAt,t.id)]);
export const weddingEnquiryLimits=sqliteTable('wedding_enquiry_limits',{id:text('id').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull()},t=>[index('idx_wedding_enquiry_limit_expiry').on(t.expiresAt)]);
export const weddingEnquiryEvents=sqliteTable('wedding_enquiry_events',{
 id:text('id').primaryKey(),enquiryId:text('enquiry_id').notNull().references(()=>weddingEnquiries.id),actorId:text('actor_id').notNull(),
 status:text('status').notNull(),note:text('note').notNull(),coordinator:text('coordinator').notNull(),followUpOn:text('follow_up_on').notNull(),createdAt:text('created_at').notNull()
},t=>[index('idx_wedding_enquiry_event_created').on(t.enquiryId,t.createdAt)]);
// Unverified public onboarding submissions; never included in the published venue catalog.
export const publicVenueIntakes=sqliteTable('public_venue_intakes',{id:text('id').primaryKey(),requestKey:text('request_key').notNull().unique(),payloadHash:text('payload_hash').notNull(),dataJson:text('data_json').notNull(),status:text('status').notNull().default('new'),convertedDraftId:text('converted_draft_id'),reviewNote:text('review_note').notNull().default(''),reviewedBy:text('reviewed_by'),reviewedAt:text('reviewed_at'),createdAt:text('created_at').notNull()},t=>[index('idx_public_intake_created').on(t.createdAt)]);
export const publicIntakeLimits=sqliteTable('public_intake_limits',{id:text('id').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull()},t=>[index('idx_public_intake_limit_expiry').on(t.expiresAt)]);
export const authOtpChallenges=sqliteTable('auth_otp_challenges',{id:text('id').primaryKey(),email:text('email').notNull(),codeHash:text('code_hash').notNull(),attempts:integer('attempts').notNull().default(0),expiresAt:integer('expires_at').notNull(),consumedAt:integer('consumed_at'),createdAt:integer('created_at').notNull(),requestIpHash:text('request_ip_hash').notNull()},t=>[index('idx_auth_otp_email_created').on(t.email,t.createdAt),index('idx_auth_otp_expiry').on(t.expiresAt)]);
export const authSessions=sqliteTable('auth_sessions',{id:text('id').primaryKey(),userId:text('user_id').notNull(),email:text('email').notNull(),role:text('role').notNull(),expiresAt:integer('expires_at').notNull(),createdAt:integer('created_at').notNull()},t=>[index('idx_auth_session_expiry').on(t.expiresAt),index('idx_auth_session_user').on(t.userId)]);
export const authRateLimits=sqliteTable('auth_rate_limits',{id:text('id').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull()},t=>[index('idx_auth_rate_limit_expiry').on(t.expiresAt)]);
export const demoSlots=sqliteTable('demo_slots',{venueSlug:text('venue_slug').notNull(),eventDate:text('event_date').notNull(),status:text('status').notNull(),holdId:text('hold_id').unique(),userId:text('user_id'),expiresAt:integer('expires_at'),quoteJson:text('quote_json'),bookingId:text('booking_id')},t=>[index('idx_demo_slot_venue_date').on(t.venueSlug,t.eventDate),index('idx_demo_slot_date').on(t.eventDate)]);
export const demoBookings=sqliteTable('demo_bookings',{id:text('id').primaryKey(),holdId:text('hold_id').notNull().unique(),userId:text('user_id').notNull(),venueSlug:text('venue_slug').notNull(),eventDate:text('event_date').notNull(),quoteJson:text('quote_json').notNull(),paymentStatus:text('payment_status').notNull(),createdAt:text('created_at').notNull()},t=>[index('idx_demo_booking_user').on(t.userId)]);
export const demoVenueSettings=sqliteTable('demo_venue_settings',{venueSlug:text('venue_slug').primaryKey(),pricingJson:text('pricing_json').notNull(),updatedAt:text('updated_at').notNull()});
export const ownerDrafts=sqliteTable('owner_drafts',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),dataJson:text('data_json').notNull(),status:text('status').notNull().default('draft'),reviewNote:text('review_note').notNull().default(''),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('idx_owner_draft_owner').on(t.ownerId)]);
export const venueReviewEvents=sqliteTable('venue_review_events',{id:text('id').primaryKey(),draftId:text('draft_id').notNull(),reviewerId:text('reviewer_id').notNull(),decision:text('decision').notNull(),note:text('note').notNull(),createdAt:text('created_at').notNull()},t=>[index('idx_venue_review_draft_created').on(t.draftId,t.createdAt)]);
export const ownerImages=sqliteTable('owner_images',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),objectKey:text('object_key').notNull(),contentType:text('content_type').notNull(),createdAt:text('created_at').notNull()});
export const requests=sqliteTable('requests',{id:text('id').primaryKey(),requestKey:text('request_key').notNull().unique(),venueSlug:text('venue_slug').notNull(),eventDate:text('event_date').notNull(),guests:integer('guests').notNull(),occasion:text('occasion').notNull(),name:text('name').notNull(),email:text('email').notNull(),notes:text('notes').notNull().default(''),status:text('status').notNull().default('demo_request'),createdAt:text('created_at').notNull()},t=>[index('idx_requests_created_at').on(t.createdAt)]);
export const applications=sqliteTable('venue_applications',{id:text('id').primaryKey(),requestKey:text('request_key').notNull().unique(),venueName:text('venue_name').notNull(),city:text('city').notNull(),contactName:text('contact_name').notNull(),email:text('email').notNull(),capacity:integer('capacity').notNull(),status:text('status').notNull().default('demo_application'),createdAt:text('created_at').notNull()});

// Persist only exempt Google IDs and app-owned intake fields. Never Google display content.
export const venueReferences=sqliteTable('venue_references',{
 venueUuid:text('venue_uuid').primaryKey(),googlePlaceId:text('google_place_id').notNull(),
 importedBy:text('imported_by').notNull(),locality:text('locality').notNull(),
 category:text('category').notNull().default('wedding_venue'),
 isClaimedByOwner:integer('is_claimed_by_owner',{mode:'boolean'}).notNull().default(false),
 customBasePrice:text('custom_base_price'),customCapacity:integer('custom_capacity'),
 createdAt:text('created_at').notNull()
},t=>[uniqueIndex('idx_venue_refs_user_place').on(t.importedBy,t.googlePlaceId)]);
export const lookupUsage=sqliteTable('google_lookup_usage',{
 id:text('id').primaryKey(),requests:integer('requests').notNull().default(0)
});

export const cateringDrafts=sqliteTable('catering_drafts',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),dataJson:text('data_json').notNull(),status:text('status').notNull().default('draft'),reviewNote:text('review_note').notNull().default(''),revision:text('revision').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('idx_catering_drafts_owner').on(t.ownerId),index('idx_catering_drafts_status').on(t.status)]);
