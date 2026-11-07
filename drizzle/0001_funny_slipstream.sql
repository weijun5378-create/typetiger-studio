CREATE INDEX `idx_project_images_project_sort` ON `project_images` (`project_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_projects_status_sort` ON `projects` (`status`,`sort_order`);