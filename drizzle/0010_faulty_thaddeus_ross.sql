CREATE TABLE `adviser_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`preferences` text NOT NULL,
	`target_units` integer NOT NULL,
	`context_hash` text NOT NULL,
	`snapshot` text NOT NULL,
	`status` text NOT NULL,
	`response` text,
	`model` text,
	`model_digest` text,
	`elapsed_ms` integer,
	`started_at` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
