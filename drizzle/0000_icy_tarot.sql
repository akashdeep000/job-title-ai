CREATE TABLE `job_titles` (
	`id` text PRIMARY KEY NOT NULL,
	`job_title` text NOT NULL,
	`status` text DEFAULT 'pending',
	`retry_count` integer DEFAULT 0,
	`job_function` text,
	`job_seniority` text,
	`confidence` real,
	`standardized_job_title` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `status_idx` ON `job_titles` (`status`);