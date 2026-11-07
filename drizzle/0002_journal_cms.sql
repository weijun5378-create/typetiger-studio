CREATE TABLE `journal_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_categories_name_unique` ON `journal_categories` (`name`);
--> statement-breakpoint
CREATE TABLE `journal_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`body_markdown` text DEFAULT '' NOT NULL,
	`category_id` text NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`cover_key` text DEFAULT '' NOT NULL,
	`cover_alt` text DEFAULT '' NOT NULL,
	`featured` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`published_snapshot_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `journal_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_articles_slug_unique` ON `journal_articles` (`slug`);
--> statement-breakpoint
CREATE INDEX `idx_journal_articles_status_date` ON `journal_articles` (`status`,`published_at`);
--> statement-breakpoint
CREATE TABLE `journal_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`revision` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`action` text NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `journal_articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_versions_article_revision_unique` ON `journal_versions` (`article_id`,`revision`);
--> statement-breakpoint
CREATE INDEX `idx_journal_versions_article_created` ON `journal_versions` (`article_id`,`created_at`);
--> statement-breakpoint
INSERT INTO `journal_categories` (`id`,`name`,`sort_order`,`created_at`,`updated_at`) VALUES
('journal-category-design-judgment','设计判断',0,datetime('now'),datetime('now')),
('journal-category-project-review','项目复盘',1,datetime('now'),datetime('now')),
('journal-category-design-management','设计管理',2,datetime('now'),datetime('now')),
('journal-category-observation','观察与思考',3,datetime('now'),datetime('now'));
