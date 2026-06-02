import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as loadDotenv } from 'dotenv'

const DEFAULT_ENV_FILES = ['.env.local', '.env']
const SCRIPT_ENV_KEYS = [
  'DATABASE_URL',
  'SEED_ADMIN_USERNAME',
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
  'SEED_ADMIN_NICKNAME',
  'SEED_ADMIN_BIO',
  'SEED_AUTHOR_USERNAME',
  'SEED_AUTHOR_EMAIL',
  'SEED_AUTHOR_PASSWORD',
  'SEED_AUTHOR_NICKNAME',
  'SEED_AUTHOR_BIO',
]

function deleteBlankScriptEnvValues(env: NodeJS.ProcessEnv): void {
  for (const key of SCRIPT_ENV_KEYS) {
    if (env[key] !== undefined && !env[key]?.trim()) {
      delete env[key]
    }
  }
}

export function loadDatabaseScriptEnv(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const explicitPath = env.DOTENV_CONFIG_PATH?.trim()
  const envFiles = explicitPath ? [explicitPath] : DEFAULT_ENV_FILES

  deleteBlankScriptEnvValues(env)

  for (const envFile of envFiles) {
    const envPath = resolve(process.cwd(), envFile)

    if (existsSync(envPath)) {
      loadDotenv({
        path: envPath,
        override: false,
        quiet: true,
        processEnv: env,
      })
      deleteBlankScriptEnvValues(env)
    }
  }

  const databaseUrl = env.DATABASE_URL?.trim()

  return databaseUrl || undefined
}
