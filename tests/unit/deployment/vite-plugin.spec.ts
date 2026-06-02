import { describe, expect, it } from 'vitest'

import type { DeploymentEnv } from '@/deployment/env'
import {
  createDeploymentAssetsPlugin,
  createDeploymentDefine,
} from '@/deployment/vite-plugin'

const env: DeploymentEnv = {
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

describe('createDeploymentAssetsPlugin', () => {
  it('injects the resolved release version into the client env', () => {
    expect(createDeploymentDefine(env)).toEqual({
      'import.meta.env.VITE_RELEASE_VERSION': JSON.stringify('abc123'),
    })
  })

  it('emits robots.txt and sitemap.xml during build', () => {
    const plugin = createDeploymentAssetsPlugin(env)
    const emitted: Array<{ fileName?: string; source?: string; type: string }> = []

    plugin.generateBundle?.call({
      emitFile(asset) {
        emitted.push(asset as { fileName?: string; source?: string; type: string })
        return asset.fileName ?? ''
      },
    } as never, {} as never, {} as never)

    expect(emitted).toEqual([
      {
        type: 'asset',
        fileName: 'robots.txt',
        source: [
          'User-agent: *',
          'Allow: /',
          '',
          'Sitemap: https://blog.production.invalid/sitemap.xml',
          '',
        ].join('\n'),
      },
      {
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          '  <url>',
          '    <loc>https://blog.production.invalid/</loc>',
          '    <changefreq>daily</changefreq>',
          '    <priority>1.0</priority>',
          '  </url>',
          '</urlset>',
          '',
        ].join('\n'),
      },
    ])
  })
})
