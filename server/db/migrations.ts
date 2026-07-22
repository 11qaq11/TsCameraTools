import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { query } from './index.js'
import { logger } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function runMigrations(): Promise<void> {
  // Create migrations tracking table
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `)

  // Get already executed migrations
  const { rows: executed } = await query<{ name: string }>(
    'SELECT name FROM _migrations ORDER BY id'
  )
  const executedNames = new Set(executed.map((r) => r.name))

  // Read migration files
  const migrationsDir = path.join(__dirname, 'migrations')
  if (!fs.existsSync(migrationsDir)) {
    logger.info('No migrations directory found, skipping')
    return
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (executedNames.has(file)) {
      logger.debug({ migration: file }, 'Already executed, skipping')
      continue
    }

    logger.info({ migration: file }, 'Running migration')
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')

    try {
      await query('BEGIN')
      await query(sql)
      await query('INSERT INTO _migrations (name) VALUES ($1)', [file])
      await query('COMMIT')
      logger.info({ migration: file }, 'Migration completed')
    } catch (err) {
      await query('ROLLBACK')
      logger.error({ migration: file, error: (err as Error).message }, 'Migration failed')
      throw err
    }
  }
}
