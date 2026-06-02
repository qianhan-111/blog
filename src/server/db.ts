import { neon } from '@neondatabase/serverless'

import { readServerEnv } from './env.js'

export type SqlQuery = ReturnType<typeof neon>

let cachedSql: SqlQuery | null = null

export function getSql(): SqlQuery {
  if (!cachedSql) {
    cachedSql = neon(readServerEnv().databaseUrl)
  }

  return cachedSql
}

export function resetSqlForTests(): void {
  cachedSql = null
}
