CREATE TABLE `demo_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`hold_id` text NOT NULL,
	`user_id` text NOT NULL,
	`venue_slug` text NOT NULL,
	`event_date` text NOT NULL,
	`quote_json` text NOT NULL,
	`payment_status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_bookings_hold_id_unique` ON `demo_bookings` (`hold_id`);--> statement-breakpoint
CREATE INDEX `idx_demo_booking_user` ON `demo_bookings` (`user_id`);--> statement-breakpoint
CREATE TABLE `demo_slots` (
	`venue_slug` text NOT NULL,
	`event_date` text NOT NULL,
	`status` text NOT NULL,
	`hold_id` text,
	`user_id` text,
	`expires_at` integer,
	`quote_json` text,
	`booking_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_slots_hold_id_unique` ON `demo_slots` (`hold_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_demo_slot_venue_date` ON `demo_slots` (`venue_slug`,`event_date`);--> statement-breakpoint
CREATE INDEX `idx_demo_slot_date` ON `demo_slots` (`event_date`);--> statement-breakpoint
CREATE TABLE `demo_venue_settings` (
	`venue_slug` text PRIMARY KEY NOT NULL,
	`pricing_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owner_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_owner_draft_owner` ON `owner_drafts` (`owner_id`);--> statement-breakpoint
CREATE TABLE `owner_images` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text NOT NULL
);
