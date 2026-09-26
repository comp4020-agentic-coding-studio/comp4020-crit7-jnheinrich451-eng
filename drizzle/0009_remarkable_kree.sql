CREATE TABLE `study_plan_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`detail` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `study_plans` (
	`student_id` integer PRIMARY KEY NOT NULL,
	`rule_year` integer NOT NULL,
	`specialisation` text NOT NULL,
	`planning_year` integer NOT NULL,
	`planning_term` text NOT NULL,
	`template_id` text,
	`template_snapshot` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
