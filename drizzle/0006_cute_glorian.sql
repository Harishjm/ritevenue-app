CREATE TABLE `auth_otp_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	`request_ip_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_otp_email_created` ON `auth_otp_challenges` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_auth_otp_expiry` ON `auth_otp_challenges` (`expires_at`);--> statement-breakpoint
CREATE TABLE `auth_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_rate_limit_expiry` ON `auth_rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_session_expiry` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_auth_session_user` ON `auth_sessions` (`user_id`);--> statement-breakpoint
ALTER TABLE `public_venue_intakes` ADD `converted_draft_id` text;