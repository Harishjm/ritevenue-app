CREATE TABLE `auth_google_flows` (
	`id` text PRIMARY KEY NOT NULL,
	`browser_hash` text NOT NULL,
	`nonce` text NOT NULL,
	`return_to` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_google_flow_expiry` ON `auth_google_flows` (`expires_at`);--> statement-breakpoint
CREATE TABLE `auth_google_identities` (
	`email` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_google_identities_subject_unique` ON `auth_google_identities` (`subject`);