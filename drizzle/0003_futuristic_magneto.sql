DROP INDEX `idx_demo_slot_venue_date`;--> statement-breakpoint
CREATE INDEX `idx_demo_slot_venue_date` ON `demo_slots` (`venue_slug`,`event_date`);