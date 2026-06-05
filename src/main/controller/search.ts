import { searches, db } from '@main/database/database'
import { desc, eq } from 'drizzle-orm'
import { CreateSearchInput, Search, UpdateSearchInput } from '@shared/types'

export async function getSearches(): Promise<Search[]> {
  return await db.select().from(searches).orderBy(desc(searches.createdAt))
}

export async function getSearchById(id: number): Promise<Search | undefined> {
  const result = await db.select().from(searches).where(eq(searches.id, id))
  return result[0]
}

export async function createSearch(data: CreateSearchInput): Promise<Search[]> {
  return await db.insert(searches).values(data).returning()
}

export async function updateSearch(id: number, data: UpdateSearchInput): Promise<Search[]> {
  return await db.update(searches).set(data).where(eq(searches.id, id)).returning()
}

export async function deleteSearch(id: number): Promise<Search[]> {
  return await db.delete(searches).where(eq(searches.id, id)).returning()
}
