CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_comments_post_created` ON `comments` (`post_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`emoji` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reactions_post_owner` ON `reactions` (`post_id`,`owner_id`);--> statement-breakpoint
ALTER TABLE `posts` ADD `image_key` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `shared_post_id` text;