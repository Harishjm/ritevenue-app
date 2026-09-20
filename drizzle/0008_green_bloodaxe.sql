ALTER TABLE `public_venue_intakes` ADD `review_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `public_venue_intakes` ADD `reviewed_by` text;--> statement-breakpoint
ALTER TABLE `public_venue_intakes` ADD `reviewed_at` text;