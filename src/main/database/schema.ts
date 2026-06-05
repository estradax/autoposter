import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql, relations } from 'drizzle-orm'

export const searches = sqliteTable('searches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  query: text('query').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
})

export const searchResults = sqliteTable('search_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  searchId: integer('search_id').references(() => searches.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  address: text('address').notNull(),
  rating: real('rating'),
  reviews: integer('reviews'),
  phone: text('phone'),
  website: text('website'),
  price: text('price'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  placeId: text('place_id'),
  openingHours: text('opening_hours'),
  plusCode: text('plus_code'),
  type: text('type'),
  url: text('url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
})

export const searchesRelations = relations(searches, ({ many }) => ({
  results: many(searchResults)
}))

export const searchResultsRelations = relations(searchResults, ({ one }) => ({
  search: one(searches, {
    fields: [searchResults.searchId],
    references: [searches.id]
  })
}))
