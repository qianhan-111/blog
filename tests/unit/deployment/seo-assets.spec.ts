import { describe, expect, it } from 'vitest'

import type { DeploymentEnv } from '@/deployment/env'
import {
  buildRobotsTxt,
  buildSitemapXml,
} from '@/deployment/seo-assets'

const baseEnv: DeploymentEnv = {
  apiBaseUrl: 'https://api.production.invalid',
  appTitle: 'Blog Platform',
  siteUrl: 'https://blog.production.invalid',
  indexingEnabled: true,
  observabilityEnabled: false,
  observabilityDsn: '',
  releaseVersion: 'abc123',
  vercelEnv: 'production',
  vercelUrl: '',
}

describe('buildRobotsTxt', () => {
  it('allows indexing and links the absolute sitemap URL when indexing is enabled', () => {
    expect(buildRobotsTxt(baseEnv)).toBe([
      'User-agent: *',
      'Allow: /',
      '',
      'Sitemap: https://blog.production.invalid/sitemap.xml',
      '',
    ].join('\n'))
  })

  it('blocks all indexing for preview builds', () => {
    expect(buildRobotsTxt({
      ...baseEnv,
      indexingEnabled: false,
      vercelEnv: 'preview',
    })).toBe([
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n'))
  })
})

describe('buildSitemapXml', () => {
  it('builds a canonical root sitemap entry', () => {
    expect(buildSitemapXml(baseEnv)).toBe([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      '  <url>',
      '    <loc>https://blog.production.invalid/</loc>',
      '    <changefreq>daily</changefreq>',
      '    <priority>1.0</priority>',
      '  </url>',
      '</urlset>',
      '',
    ].join('\n'))
  })

  it('emits an empty urlset when the site URL is unavailable', () => {
    expect(buildSitemapXml({
      ...baseEnv,
      siteUrl: '',
    })).toBe([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      '</urlset>',
      '',
    ].join('\n'))
  })
})
