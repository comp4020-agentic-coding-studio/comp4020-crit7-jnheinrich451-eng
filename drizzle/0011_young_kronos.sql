CREATE TABLE `email_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`sent_at` integer,
	`confirmed_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_checks_token_hash_unique` ON `email_checks` (`token_hash`);