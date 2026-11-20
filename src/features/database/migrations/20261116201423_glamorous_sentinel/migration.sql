CREATE TABLE IF NOT EXISTS `design_materials` (
	`id` text PRIMARY KEY,
	`design_id` text NOT NULL,
	`material_id` text NOT NULL,
	`colour` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_design_materials_design_id_designs_id_fk` FOREIGN KEY (`design_id`) REFERENCES `designs`(`id`),
	CONSTRAINT `fk_design_materials_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`),
	CONSTRAINT "design_materials_role_check" CHECK("role" in ('main', 'secondary', 'other'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `materials` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `design_materials_design_id_idx` ON `design_materials` (`design_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `design_materials_material_id_idx` ON `design_materials` (`material_id`);