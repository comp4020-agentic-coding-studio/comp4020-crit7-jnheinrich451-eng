ALTER TABLE `applications` ADD `assessment` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `scenario_key` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `request_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `applications_request_key_unique` ON `applications` (`request_key`);