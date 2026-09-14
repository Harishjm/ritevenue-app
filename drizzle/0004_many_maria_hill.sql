CREATE TABLE `catering_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`revision` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_catering_drafts_owner` ON `catering_drafts` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_catering_drafts_status` ON `catering_drafts` (`status`);