CREATE TABLE `google_lookup_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `venue_references` (
	`venue_uuid` text PRIMARY KEY NOT NULL,
	`google_place_id` text NOT NULL,
	`imported_by` text NOT NULL,
	`locality` text NOT NULL,
	`category` text DEFAULT 'wedding_venue' NOT NULL,
	`is_claimed_by_owner` integer DEFAULT false NOT NULL,
	`custom_base_price` text,
	`custom_capacity` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_venue_refs_user_place` ON `venue_references` (`imported_by`,`google_place_id`);