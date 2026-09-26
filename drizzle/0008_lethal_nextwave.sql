CREATE TABLE `enrolment_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enrolment_id` integer NOT NULL,
	`student_id` integer NOT NULL,
	`revision` integer NOT NULL,
	`kind` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`enrolment_id`) REFERENCES `enrolments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `enrolments` ADD `ended_at` text;--> statement-breakpoint
ALTER TABLE `enrolments` ADD `ended_reason` text;--> statement-breakpoint
ALTER TABLE `enrolments` ADD `revision` integer DEFAULT 1 NOT NULL;