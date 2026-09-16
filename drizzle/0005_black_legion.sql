CREATE TABLE `public_intake_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_public_intake_limit_expiry` ON `public_intake_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `public_venue_intakes` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`data_json` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_venue_intakes_request_key_unique` ON `public_venue_intakes` (`request_key`);--> statement-breakpoint
CREATE INDEX `idx_public_intake_created` ON `public_venue_intakes` (`created_at`);