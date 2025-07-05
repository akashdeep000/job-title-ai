CREATE TABLE `job` (
	`id` text PRIMARY KEY NOT NULL,
	`unique_job_table_id` integer,
	FOREIGN KEY (`unique_job_table_id`) REFERENCES `unique_job`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `unique_job` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_title` text NOT NULL,
	`job_function` text,
	`job_seniority` text,
	`confidence` real,
	`status` text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_job_job_title_unique` ON `unique_job` (`job_title`);--> statement-breakpoint
CREATE INDEX `job_titles_idx` ON `unique_job` (`job_title`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `unique_job` (`status`);--> statement-breakpoint
CREATE INDEX `confidence_idx` ON `unique_job` (`confidence`);