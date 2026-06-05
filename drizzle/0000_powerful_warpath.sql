CREATE TABLE `bot_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cookies` text NOT NULL,
	`local_storage` text NOT NULL,
	`post_content` text NOT NULL,
	`media_file_paths` text NOT NULL
);
