import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

import { loadDatabaseScriptEnv } from './db-script-env'
import { splitSqlStatements } from './db-schema'

const databaseUrl = loadDatabaseScriptEnv()

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

const sql = neon(databaseUrl)
const schema = readFileSync('src/server/schema.sql', 'utf8')

for (const statement of splitSqlStatements(schema)) {
  await sql.query(statement)
}

console.log('Database migration complete')
