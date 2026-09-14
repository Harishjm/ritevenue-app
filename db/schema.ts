import {sqliteTable,text,integer,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const demoSlots=sqliteTable('demo_slots',{venueSlug:text('venue_slug').notNull(),eventDate:text('event_date').notNull(),status:text('status').notNull(),holdId:text('hold_id').unique(),userId:text('user_id'),expiresAt:integer('expires_at'),quoteJson:text('quote_json'),bookingId:text('booking_id')},t=>[index('idx_demo_slot_venue_date').on(t.venueSlug,t.eventDate),index('idx_demo_slot_date').on(t.eventDate)]);
export const demoBookings=sqliteTable('demo_bookings',{id:text('id').primaryKey(),holdId:text('hold_id').notNull().unique(),userId:text('user_id').notNull(),venueSlug:text('venue_slug').notNull(),eventDate:text('event_date').notNull(),quoteJson:text('quote_json').notNull(),paymentStatus:text('payment_status').notNull(),createdAt:text('created_at').notNull()},t=>[index('idx_demo_booking_user').on(t.userId)]);
export const demoVenueSettings=sqliteTable('demo_venue_settings',{venueSlug:text('venue_slug').primaryKey(),pricingJson:text('pricing_json').notNull(),updatedAt:text('updated_at').notNull()});
export const ownerDrafts=sqliteTable('owner_drafts',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),dataJson:text('data_json').notNull(),status:text('status').notNull().default('draft'),reviewNote:text('review_note').notNull().default(''),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('idx_owner_draft_owner').on(t.ownerId)]);
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
