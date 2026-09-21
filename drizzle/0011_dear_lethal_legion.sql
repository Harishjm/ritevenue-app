CREATE TABLE `intake_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`intake_id` text NOT NULL,
	`position` integer NOT NULL,
	`object_key` text NOT NULL,
	`description` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	FOREIGN KEY (`intake_id`) REFERENCES `public_venue_intakes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_intake_photo_position` ON `intake_photos` (`intake_id`,`position`);