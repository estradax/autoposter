CREATE TABLE `search_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`search_id` integer,
	`title` text NOT NULL,
	`address` text NOT NULL,
	`rating` real,
	`reviews` integer,
	`phone` text,
	`website` text,
	`price` text,
	`latitude` real,
	`longitude` real,
	`place_id` text,
	`opening_hours` text,
	`plus_code` text,
	`type` text,
	`url` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`search_id`) REFERENCES `searches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `searches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`query` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
