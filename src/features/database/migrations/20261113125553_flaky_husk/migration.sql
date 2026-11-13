CREATE TABLE IF NOT EXISTS `categories` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`seed_key` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `collections` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`year` integer,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `design_events` (
	`id` text PRIMARY KEY,
	`design_id` text NOT NULL,
	`kind` text NOT NULL,
	`reason` text,
	`potential_improvements` text,
	`diff` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_design_events_design_id_designs_id_fk` FOREIGN KEY (`design_id`) REFERENCES `designs`(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `designs` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`category_id` text,
	`collection_id` text,
	`status` text NOT NULL,
	`search_text` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_designs_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`),
	CONSTRAINT `fk_designs_collection_id_collections_id_fk` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`),
	CONSTRAINT "designs_status_check" CHECK("status" in ('concept', 'in_development', 'approved', 'produced', 'rejected', 'archived'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `design_events_design_id_created_at_idx` ON `design_events` (`design_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `designs_status_idx` ON `designs` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `designs_collection_id_idx` ON `designs` (`collection_id`);