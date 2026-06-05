import { app } from 'electron'
import { join, resolve } from 'path'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from './schema'

const userDataPath = app.getPath('userData')
const dbPath = join(userDataPath, 'database.db')

export const client = createClient({
  url: `file:${dbPath}`
})

export const db = drizzle(client, { schema })

export async function runMigrations(): Promise<void> {
  const migrationsPath = app.isPackaged
    ? join(process.resourcesPath, 'drizzle')
    : resolve(__dirname, '../../drizzle')

  try {
    await migrate(db, { migrationsFolder: migrationsPath })
    console.log('✅ Migrations successful')
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

export type Database = typeof db
export * from './schema'
