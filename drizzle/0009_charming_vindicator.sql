CREATE TABLE `wedding_enquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`data_json` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`coordinator` text DEFAULT '' NOT NULL,
	`follow_up_on` text DEFAULT '' NOT NULL,
	`revision` text NOT NULL,
	`consent_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wedding_enquiries_request_key_unique` ON `wedding_enquiries` (`request_key`);--> statement-breakpoint
CREATE INDEX `idx_wedding_enquiry_created` ON `wedding_enquiries` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_wedding_enquiry_status_created` ON `wedding_enquiries` (`status`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `wedding_enquiry_events` (
	`id` text PRIMARY KEY NOT NULL,
	`enquiry_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`status` text NOT NULL,
	`note` text NOT NULL,
	`coordinator` text NOT NULL,
	`follow_up_on` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`enquiry_id`) REFERENCES `wedding_enquiries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_wedding_enquiry_event_created` ON `wedding_enquiry_events` (`enquiry_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `wedding_enquiry_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_wedding_enquiry_limit_expiry` ON `wedding_enquiry_limits` (`expires_at`);