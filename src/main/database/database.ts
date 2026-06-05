import { app } from 'electron'
import { join, resolve } from 'path'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from './schema'
import fs from 'fs'

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

  const journalPath = join(migrationsPath, 'meta', '_journal.json')
  if (!fs.existsSync(journalPath)) {
    console.log('ℹ️ No migrations found to run (drizzle/meta/_journal.json is missing).')
    return
  }

  try {
    await migrate(db, { migrationsFolder: migrationsPath })
    console.log('✅ Migrations successful')
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

export type Database = typeof db
export * from './schema'
