CREATE TABLE `catalogue_references` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_id` integer NOT NULL,
	`position` integer NOT NULL,
	`section` text NOT NULL,
	`block` integer NOT NULL,
	`quote` text NOT NULL,
	`kind` text NOT NULL,
	`code` text NOT NULL,
	`year` integer,
	`url` text,
	`basis` text NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `catalogue_snapshots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalogue_reference_position` ON `catalogue_references` (`snapshot_id`,`position`);--> statement-breakpoint
CREATE TABLE `catalogue_reviews` (
	`snapshot_id` integer PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'unreviewed' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `catalogue_snapshots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `catalogue_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version_id` integer NOT NULL,
	`hash` text NOT NULL,
	`evidence` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`version_id`) REFERENCES `catalogue_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalogue_snapshots_hash_unique` ON `catalogue_snapshots` (`hash`);--> statement-breakpoint
CREATE TABLE `catalogue_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_id` integer NOT NULL,
	`path` text NOT NULL,
	`sha256` text NOT NULL,
	`url` text,
	`url_basis` text NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `catalogue_snapshots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalogue_source_evidence` ON `catalogue_sources` (`snapshot_id`,`path`,`sha256`);--> statement-breakpoint
CREATE TABLE `catalogue_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`code` text NOT NULL,
	`year` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalogue_identity` ON `catalogue_versions` (`kind`,`code`,`year`);