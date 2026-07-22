import pg from 'pg'
import { config } from '../config.js'
import { logger } from '../utils/logger.js'

const { Pool } = pg

let pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.database.url,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    pool.on('error', (err) => {
      logger.error({ error: err.message }, 'Unexpected PostgreSQL pool error')
    })

    pool.on('connect', () => {
      logger.debug('New PostgreSQL client connected')
    })
  }
  return pool
}

export async function query<T extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const client = await getPool().connect()
  try {
    const start = Date.now()
    const result = await client.query<T>(text, params)
    const duration = Date.now() - start
    if (duration > 100) {
      logger.warn({ query: text.substring(0, 100), duration }, 'Slow query')
    }
    return result
  } finally {
    client.release()
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    logger.info('PostgreSQL pool closed')
  }
}
