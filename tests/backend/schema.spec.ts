// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { splitSqlStatements } from '../../scripts/db-schema'

describe('database schema', () => {
  const schema = readFileSync('src/server/schema.sql', 'utf8')
  const seedScript = readFileSync('scripts/db-seed.ts', 'utf8')

  it('defines all backend tables needed by the frontend', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS users')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS articles')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS categories')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS tags')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS article_categories')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS article_tags')
  })

  it('keeps referenced categories and tags from being silently deleted', () => {
    expect(schema).toContain('category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT')
    expect(schema).toContain('tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE RESTRICT')
  })

  it('allows authors to keep multiple untitled drafts or reuse article titles', () => {
    expect(schema).toContain('DROP INDEX IF EXISTS idx_articles_author_title_unique')
    expect(schema).not.toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_author_title_unique')
    expect(seedScript).not.toContain('ON CONFLICT (author_id, title)')
  })

  it('splits schema SQL into individual executable statements', () => {
    expect(splitSqlStatements(schema)).toHaveLength(11)
  })

  it('does not split semicolons inside quoted SQL values', () => {
    expect(splitSqlStatements(`
      CREATE TABLE demo (text_value TEXT DEFAULT 'a;b');
      CREATE INDEX demo_text_idx ON demo (text_value);
    `)).toEqual([
      "CREATE TABLE demo (text_value TEXT DEFAULT 'a;b')",
      'CREATE INDEX demo_text_idx ON demo (text_value)',
    ])
  })
})
