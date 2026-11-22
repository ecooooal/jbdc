CREATE TABLE IF NOT EXISTS `image_notes` (
	`id` text PRIMARY KEY,
	`image_id` text NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_image_notes_image_id_images_id_fk` FOREIGN KEY (`image_id`) REFERENCES `images`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `image_notes_image_id_idx` ON `image_notes` (`image_id`);