CREATE TABLE `venue_photo` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`stored_filename` text NOT NULL,
	`alt_text` text NOT NULL,
	`display_order` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_venue_photo_order` ON `venue_photo` (`venue_id`,`display_order`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_venue_photo_filename` ON `venue_photo` (`venue_id`,`stored_filename`);