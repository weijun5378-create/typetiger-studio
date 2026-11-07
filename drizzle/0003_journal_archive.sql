ALTER TABLE `journal_articles` ADD `archived_at` text;
--> statement-breakpoint
CREATE INDEX `idx_journal_articles_archived` ON `journal_articles` (`archived_at`);
