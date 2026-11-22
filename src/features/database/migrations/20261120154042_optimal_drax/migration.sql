CREATE TABLE IF NOT EXISTS `images` (
	`id` text PRIMARY KEY,
	`design_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`extension` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_images_design_id_designs_id_fk` FOREIGN KEY (`design_id`) REFERENCES `designs`(`id`),
	CONSTRAINT "images_kind_check" CHECK("kind" in ('inspiration', 'sketch', 'prototype', 'final'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `images_design_id_idx` ON `images` (`design_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `images_content_hash_idx` ON `images` (`content_hash`);