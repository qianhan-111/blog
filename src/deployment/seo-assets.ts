import type { DeploymentEnv } from './env'

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}

export function buildRobotsTxt(env: DeploymentEnv): string {
  if (!env.indexingEnabled) {
    return [
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n')
  }

  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${withTrailingSlash(env.siteUrl)}sitemap.xml`,
    '',
  ].join('\n')
}

export function buildSitemapXml(env: DeploymentEnv): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]

  if (env.siteUrl) {
    lines.push(
      '  <url>',
      `    <loc>${withTrailingSlash(env.siteUrl)}</loc>`,
      '    <changefreq>daily</changefreq>',
      '    <priority>1.0</priority>',
      '  </url>',
    )
  }

  lines.push('</urlset>', '')

  return lines.join('\n')
}
