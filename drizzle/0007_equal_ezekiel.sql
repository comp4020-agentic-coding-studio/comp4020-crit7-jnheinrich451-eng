CREATE TABLE `overload_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` integer NOT NULL,
	`actor` text NOT NULL,
	`actor_name` text NOT NULL,
	`kind` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `overload_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `overload_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`reviewer_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`year` integer NOT NULL,
	`term` text NOT NULL,
	`period` text NOT NULL,
	`requested_limit` integer,
	`approved_limit` integer,
	`statement` text NOT NULL,
	`reason` text NOT NULL,
	`status` text NOT NULL,
	`assessment` text NOT NULL,
	`request_key` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `convenors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `overload_requests_request_key_unique` ON `overload_requests` (`request_key`);--> statement-breakpoint
ALTER TABLE `convenors` ADD `purpose` text DEFAULT 'course' NOT NULL;--> statement-breakpoint
ALTER TABLE `enrolments` ADD `units` integer;--> statement-breakpoint
ALTER TABLE `enrolments` ADD `overload_request_id` integer REFERENCES overload_requests(id);--> statement-breakpoint
ALTER TABLE `transcript` ADD `mark` real;--> statement-breakpoint
ALTER TABLE `transcript` ADD `program` text;--> statement-breakpoint
ALTER TABLE `transcript` ADD `institution` text;