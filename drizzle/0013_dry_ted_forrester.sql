CREATE TABLE `reviewer_invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`convenor_id` integer NOT NULL,
	`invited_by` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`accepted_at` integer,
	`cancelled_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`convenor_id`) REFERENCES `convenors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pending_reviewer_account` ON `reviewer_invitations` (`account_id`) WHERE "reviewer_invitations"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX `pending_reviewer_slot` ON `reviewer_invitations` (`convenor_id`) WHERE "reviewer_invitations"."status" = 'pending';--> statement-breakpoint
ALTER TABLE `email_tokens` ADD `invitation_id` integer REFERENCES reviewer_invitations(id);--> statement-breakpoint
ALTER TABLE `sessions` ADD `active_role` text;