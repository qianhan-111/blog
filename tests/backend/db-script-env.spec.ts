// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadDatabaseScriptEnv } from '../../scripts/db-script-env'

const originalCwd = process.cwd()
const originalDatabaseUrl = process.env.DATABASE_URL
const originalDotenvConfigPath = process.env.DOTENV_CONFIG_PATH
const tempDirs: string[] = []

function withTempProject(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'blog-db-env-'))
  tempDirs.push(dir)

  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content)
  }

  process.chdir(dir)

  return dir
}

afterEach(() => {
  process.chdir(originalCwd)
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl
  }

  if (originalDotenvConfigPath === undefined) {
    delete process.env.DOTENV_CONFIG_PATH
  } else {
    process.env.DOTENV_CONFIG_PATH = originalDotenvConfigPath
  }

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) {
      rmSync(dir, { recursive: true, force: true })
    }
  }
})

describe('database script env loading', () => {
  it('loads DATABASE_URL from .env.local without requiring DOTENV_CONFIG_PATH', () => {
    const dir = withTempProject({
      '.env.local': 'DATABASE_URL=postgresql://local-file\n',
    })
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    try {
      expect(loadDatabaseScriptEnv()).toBe('postgresql://local-file')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    } finally {
      consoleLogSpy.mockRestore()
    }

    expect(dir).toContain('blog-db-env-')
  })

  it('uses .env as a fallback when .env.local is absent', () => {
    const dir = withTempProject({
      '.env': 'DATABASE_URL=postgresql://env-file\n',
    })

    expect(loadDatabaseScriptEnv()).toBe('postgresql://env-file')

    expect(dir).toContain('blog-db-env-')
  })

  it('keeps .env.local ahead of .env', () => {
    const dir = withTempProject({
      '.env.local': 'DATABASE_URL=postgresql://local-file\n',
      '.env': 'DATABASE_URL=postgresql://env-file\n',
    })

    expect(loadDatabaseScriptEnv()).toBe('postgresql://local-file')

    expect(dir).toContain('blog-db-env-')
  })

  it('ignores an empty DATABASE_URL in .env.local and falls back to .env', () => {
    const dir = withTempProject({
      '.env.local': 'DATABASE_URL=\n',
      '.env': 'DATABASE_URL=postgresql://env-file\n',
    })

    expect(loadDatabaseScriptEnv()).toBe('postgresql://env-file')

    expect(dir).toContain('blog-db-env-')
  })

  it('keeps explicit shell DATABASE_URL ahead of .env.local', () => {
    const dir = withTempProject({
      '.env.local': 'DATABASE_URL=postgresql://local-file\n',
    })
    process.env.DATABASE_URL = 'postgresql://shell-env'

    expect(loadDatabaseScriptEnv()).toBe('postgresql://shell-env')

    expect(dir).toContain('blog-db-env-')
  })

  it('ignores an empty shell DATABASE_URL and falls back to .env.local', () => {
    const dir = withTempProject({
      '.env.local': 'DATABASE_URL=postgresql://local-file\n',
    })
    process.env.DATABASE_URL = ''

    expect(loadDatabaseScriptEnv()).toBe('postgresql://local-file')

    expect(dir).toContain('blog-db-env-')
  })

  it('still supports DOTENV_CONFIG_PATH for custom env files', () => {
    const dir = withTempProject({
      '.custom.env': 'DATABASE_URL=postgresql://custom-file\n',
    })
    process.env.DOTENV_CONFIG_PATH = '.custom.env'

    expect(loadDatabaseScriptEnv()).toBe('postgresql://custom-file')

    expect(dir).toContain('blog-db-env-')
  })
})
