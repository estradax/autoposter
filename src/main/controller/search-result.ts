import { db, searchResults } from '@main/database/database'
import { CreateSearchResultInput, SearchResult } from '@shared/types'
import { eq, desc } from 'drizzle-orm'

export async function createSearchResultBulk(
  results: CreateSearchResultInput[]
): Promise<SearchResult[]> {
  return await db.transaction(async (tx) => {
    return await tx.insert(searchResults).values(results).returning()
  })
}

export async function getSearchResults(params?: { search_id?: number }): Promise<SearchResult[]> {
  const query = db.select().from(searchResults)

  if (params?.search_id) {
    return await query
      .where(eq(searchResults.searchId, params.search_id))
      .orderBy(desc(searchResults.createdAt))
  }

  return await query.orderBy(desc(searchResults.createdAt))
}
