CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`date` text NOT NULL,
	`project` text,
	`hours` real,
	`amount` real,
	`end_date` text,
	`note` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`file_key` text,
	`file_name` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_entries_owner_kind` ON `entries` (`owner_id`,`kind`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_posts_created` ON `posts` (`created_at`);