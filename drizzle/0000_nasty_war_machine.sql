CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `project_images` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`object_key` text NOT NULL,
	`alt` text DEFAULT '' NOT NULL,
	`focal_point` text DEFAULT 'center' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title_zh` text NOT NULL,
	`title_en` text NOT NULL,
	`category_id` text NOT NULL,
	`subtitle_zh` text DEFAULT '' NOT NULL,
	`subtitle_en` text DEFAULT '' NOT NULL,
	`year` text DEFAULT '' NOT NULL,
	`background` text DEFAULT '' NOT NULL,
	`problem` text DEFAULT '' NOT NULL,
	`constraints` text DEFAULT '' NOT NULL,
	`judgment` text DEFAULT '' NOT NULL,
	`solution` text DEFAULT '' NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`focus` text DEFAULT '' NOT NULL,
	`cover_key` text DEFAULT '' NOT NULL,
	`cover_alt` text DEFAULT '' NOT NULL,
	`card_width` text DEFAULT 'medium' NOT NULL,
	`focal_point` text DEFAULT 'center' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`site_name` text NOT NULL,
	`intro` text NOT NULL,
	`about` text NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`social_links` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL
);
