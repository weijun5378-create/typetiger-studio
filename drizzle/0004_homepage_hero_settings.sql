ALTER TABLE `site_settings` ADD COLUMN `hero_eyebrow` text DEFAULT 'Design Director · Portfolio & Journal' NOT NULL;
--> statement-breakpoint
ALTER TABLE `site_settings` ADD COLUMN `hero_title` text DEFAULT 'Designing Products.\nBuilding Systems.' NOT NULL;
--> statement-breakpoint
ALTER TABLE `site_settings` ADD COLUMN `hero_title_zh` text DEFAULT '从产品设计到品牌系统。' NOT NULL;
--> statement-breakpoint
ALTER TABLE `site_settings` ADD COLUMN `hero_description` text DEFAULT '一名设计总监的个人作品集与设计思考。关注产品、品牌、CMF 与包装之间的关系，也记录判断如何在真实项目中形成。' NOT NULL;
--> statement-breakpoint
ALTER TABLE `site_settings` ADD COLUMN `hero_cta_label` text DEFAULT '查看精选作品' NOT NULL;
