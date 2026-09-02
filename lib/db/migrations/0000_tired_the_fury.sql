CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`status` text DEFAULT 'pending_review',
	`resume_version` text,
	`cover_letter` text,
	`qa_responses` text,
	`fields_filled` integer,
	`fields_total` integer,
	`fill_details` text,
	`screenshot_path` text,
	`outcome` text,
	`outcome_note` text,
	`outcome_updated_at` text,
	`state_history` text DEFAULT '[]',
	`error_log` text,
	`created_at` text DEFAULT (datetime('now')),
	`submitted_at` text,
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`job_id`) REFERENCES `job_postings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_applications_status` ON `applications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_applications_job` ON `applications` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_applications_outcome` ON `applications` (`outcome`);--> statement-breakpoint
CREATE TABLE `automation_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`steps` text DEFAULT '[]',
	`auto_apply` integer DEFAULT 0,
	`min_match_score` integer DEFAULT 70,
	`max_applies_per_run` integer DEFAULT 10,
	`run_interval_hours` integer DEFAULT 12,
	`enabled` integer DEFAULT 1,
	`last_run_at` text,
	`next_run_at` text,
	`total_runs` integer DEFAULT 0,
	`total_applied` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`doc_type` text NOT NULL,
	`display_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_format` text,
	`extracted_text` text,
	`parsed_structure` text,
	`checksum` text,
	`size_bytes` integer,
	`origin` text DEFAULT 'uploaded',
	`source_job_id` text,
	`is_default` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_documents_profile` ON `documents` (`profile_id`);--> statement-breakpoint
CREATE INDEX `idx_documents_type` ON `documents` (`doc_type`);--> statement-breakpoint
CREATE TABLE `job_postings` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`location` text,
	`employment_type` text,
	`seniority` text,
	`description` text,
	`requirements` text,
	`salary_info` text,
	`application_url` text,
	`company_url` text,
	`match_score` real,
	`match_breakdown` text,
	`match_explanation` text,
	`state` text DEFAULT 'new',
	`discovered_at` text DEFAULT (datetime('now')),
	`last_seen_at` text DEFAULT (datetime('now')),
	`expires_at` text,
	`raw_data` text,
	`content_hash` text
);
--> statement-breakpoint
CREATE INDEX `idx_job_postings_state` ON `job_postings` (`state`);--> statement-breakpoint
CREATE INDEX `idx_job_postings_company` ON `job_postings` (`company`);--> statement-breakpoint
CREATE INDEX `idx_job_postings_score` ON `job_postings` (`match_score`);--> statement-breakpoint
CREATE INDEX `idx_job_postings_discovered` ON `job_postings` (`discovered_at`);--> statement-breakpoint
CREATE INDEX `idx_job_postings_source` ON `job_postings` (`source`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_job_postings_content_hash` ON `job_postings` (`content_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `job_postings_source_source_id_unique` ON `job_postings` (`source`,`source_id`);--> statement-breakpoint
CREATE TABLE `platforms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'disconnected',
	`cookies` text,
	`auth_token` text,
	`connected_at` text,
	`last_checked_at` text,
	`expires_at` text,
	`error_message` text,
	`daily_limit` integer,
	`applied_today` integer DEFAULT 0,
	`limit_reset_at` text
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`full_name` text,
	`email` text,
	`phone` text,
	`location` text,
	`linkedin_url` text,
	`portfolio_url` text,
	`summary` text,
	`skills` text DEFAULT '[]',
	`experience_years` integer,
	`seniority` text DEFAULT 'mid',
	`target_titles` text DEFAULT '[]',
	`target_locations` text DEFAULT '[]',
	`work_mode` text DEFAULT 'any',
	`salary_min` integer,
	`salary_max` integer,
	`salary_currency` text DEFAULT 'INR',
	`target_industries` text DEFAULT '[]',
	`exclude_companies` text DEFAULT '[]',
	`exclude_keywords` text DEFAULT '[]',
	`min_company_size` text,
	`visa_required` integer DEFAULT 0,
	`resume_path` text,
	`resume_data` text,
	`resume_parsed` text,
	`cover_letter_template` text,
	`default_answers` text DEFAULT '{}',
	`notice_period` text DEFAULT '30 days',
	`is_active` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `qa_bank` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`question_pattern` text NOT NULL,
	`question_type` text,
	`answer` text NOT NULL,
	`variants` text DEFAULT '[]',
	`confidence` text DEFAULT 'high',
	`source` text DEFAULT 'manual',
	`use_count` integer DEFAULT 0,
	`last_used_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_qa_bank_profile` ON `qa_bank` (`profile_id`);--> statement-breakpoint
CREATE INDEX `idx_qa_bank_pattern` ON `qa_bank` (`question_pattern`);--> statement-breakpoint
CREATE TABLE `search_queries` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`source` text NOT NULL,
	`keywords` text NOT NULL,
	`location` text,
	`filters` text DEFAULT '{}',
	`status` text DEFAULT 'active',
	`last_run_at` text,
	`last_success_at` text,
	`result_count` integer DEFAULT 0,
	`max_pages` integer DEFAULT 3,
	`run_interval_hours` integer DEFAULT 24,
	`next_run_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_search_queries_profile` ON `search_queries` (`profile_id`);--> statement-breakpoint
CREATE INDEX `idx_search_queries_status` ON `search_queries` (`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'queued',
	`payload` text,
	`result` text,
	`error` text,
	`attempts` integer DEFAULT 0,
	`max_attempts` integer DEFAULT 3,
	`job_id` text,
	`application_id` text,
	`parent_task_id` text,
	`scheduled_for` text DEFAULT (datetime('now')),
	`started_at` text,
	`finished_at` text,
	`priority` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`job_id`) REFERENCES `job_postings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_status` ON `tasks` (`status`,`scheduled_for`);--> statement-breakpoint
CREATE INDEX `idx_tasks_kind` ON `tasks` (`kind`);