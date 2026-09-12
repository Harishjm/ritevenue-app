CREATE TABLE `venue_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`venue_name` text NOT NULL,
	`city` text NOT NULL,
	`contact_name` text NOT NULL,
	`email` text NOT NULL,
	`capacity` integer NOT NULL,
	`status` text DEFAULT 'demo_application' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venue_applications_request_key_unique` ON `venue_applications` (`request_key`);--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`venue_slug` text NOT NULL,
	`event_date` text NOT NULL,
	`guests` integer NOT NULL,
	`occasion` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'demo_request' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `requests_request_key_unique` ON `requests` (`request_key`);--> statement-breakpoint
CREATE INDEX `idx_requests_created_at` ON `requests` (`created_at`);