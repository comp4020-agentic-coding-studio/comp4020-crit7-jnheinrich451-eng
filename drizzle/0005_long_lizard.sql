PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`convenor_id` integer NOT NULL,
	`term` text NOT NULL,
	`year` integer DEFAULT 2027 NOT NULL,
	`statement` text NOT NULL,
	`status` text NOT NULL,
	`checks` text NOT NULL,
	`permission_code` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`convenor_id`) REFERENCES `convenors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_applications`("id", "student_id", "course_id", "convenor_id", "term", "year", "statement", "status", "checks", "permission_code", "created_at") SELECT "id", "student_id", "course_id", "convenor_id", "term", "year", "statement", "status", "checks", "permission_code", "created_at" FROM `applications`;--> statement-breakpoint
DROP TABLE `applications`;--> statement-breakpoint
ALTER TABLE `__new_applications` RENAME TO `applications`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`units` integer,
	`terms` text NOT NULL,
	`convenor_id` integer NOT NULL,
	FOREIGN KEY (`convenor_id`) REFERENCES `convenors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_courses`("id", "code", "title", "units", "terms", "convenor_id") SELECT "id", "code", "title", "units", "terms", "convenor_id" FROM `courses`;--> statement-breakpoint
DROP TABLE `courses`;--> statement-breakpoint
ALTER TABLE `__new_courses` RENAME TO `courses`;--> statement-breakpoint
CREATE UNIQUE INDEX `courses_code_unique` ON `courses` (`code`);--> statement-breakpoint
CREATE TABLE `__new_enrolments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`term` text NOT NULL,
	`year` integer DEFAULT 2027 NOT NULL,
	`via` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_enrolments`("id", "student_id", "course_id", "term", "year", "via", "created_at") SELECT "id", "student_id", "course_id", "term", "year", "via", "created_at" FROM `enrolments`;--> statement-breakpoint
DROP TABLE `enrolments`;--> statement-breakpoint
ALTER TABLE `__new_enrolments` RENAME TO `enrolments`;--> statement-breakpoint
CREATE UNIQUE INDEX `enrolments_student_course_term` ON `enrolments` (`student_id`,`course_id`,`year`,`term`);