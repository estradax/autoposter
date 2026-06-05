import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const botConfigs = sqliteTable('bot_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cookies: text('cookies').notNull(),
  localStorage: text('local_storage').notNull(),
  postContent: text('post_content').notNull(),
  mediaFilePaths: text('media_file_paths').notNull()
})
