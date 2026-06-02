import { describe, expect, it } from 'vitest'

import {
  readDeploymentEnv,
  validateVercelDeploymentEnv,
} from '@/deployment/env'

describe('readDeploymentEnv', () => {
  it('normalizes site URL and reads boolean flags', () => {
    const env = readDeploymentEnv({
      VITE_API_BASE_URL: 'https://api.blog.example.internal',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_SITE_URL: 'https://blog.example.internal/',
      VITE_INDEXING_ENABLED: 'true',
      VITE_OBSERVABILITY_ENABLED: 'false',
      VITE_OBSERVABILITY_DSN: '',
      VITE_RELEASE_VERSION: 'abc123',
      VERCEL_ENV: 'production',
    })

    expect(env).toEqual({
      apiBaseUrl: 'https://api.blog.example.internal',
      appTitle: 'Blog Platform',
      siteUrl: 'https://blog.example.internal',
      indexingEnabled: true,
      observabilityEnabled: false,
      observabilityDsn: '',
      releaseVersion: 'abc123',
      vercelEnv: 'production',
      vercelUrl: '',
    })
  })

  it('derives the site URL from VERCEL_URL when VITE_SITE_URL is absent', () => {
    const env = readDeploymentEnv({
      VITE_API_BASE_URL: 'https://api.blog.example.internal',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_INDEXING_ENABLED: '',
      VITE_OBSERVABILITY_ENABLED: '',
      VITE_RELEASE_VERSION: 'abc123',
      VERCEL_ENV: 'preview',
      VERCEL_URL: 'blog-git-main-team.vercel.app',
    })

    expect(env.siteUrl).toBe('https://blog-git-main-team.vercel.app')
    expect(env.indexingEnabled).toBe(false)
  })

  it('prefers the Vercel production URL for production builds when VITE_SITE_URL is absent', () => {
    const env = readDeploymentEnv({
      VITE_API_BASE_URL: '/api',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_INDEXING_ENABLED: 'true',
      VITE_RELEASE_VERSION: 'abc123',
      VERCEL_ENV: 'production',
      VERCEL_URL: 'blog-git-main-team.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'blog-platform.vercel.app',
    })

    expect(env.siteUrl).toBe('https://blog-platform.vercel.app')
  })

  it('defaults production indexing to enabled when the flag is omitted', () => {
    const env = readDeploymentEnv({
      VITE_API_BASE_URL: '/api',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_SITE_URL: 'https://blog.production.invalid',
      VITE_RELEASE_VERSION: 'abc123',
      VERCEL_ENV: 'production',
    })

    expect(env.indexingEnabled).toBe(true)
  })

  it('uses the Vercel Git commit SHA as the release version when VITE_RELEASE_VERSION is absent', () => {
    const env = readDeploymentEnv({
      VITE_API_BASE_URL: '/api',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_SITE_URL: 'https://blog.production.invalid',
      VITE_INDEXING_ENABLED: 'true',
      VERCEL_ENV: 'production',
      VERCEL_GIT_COMMIT_SHA: 'abc123def456',
    })

    expect(env.releaseVersion).toBe('abc123def456')
  })
})

describe('validateVercelDeploymentEnv', () => {
  it('rejects unsafe production API, site, and release values', () => {
    const errors = validateVercelDeploymentEnv(readDeploymentEnv({
      VITE_API_BASE_URL: 'https://api.example.com',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_SITE_URL: 'https://example.com',
      VITE_INDEXING_ENABLED: 'true',
      VITE_OBSERVABILITY_ENABLED: 'true',
      VITE_OBSERVABILITY_DSN: '',
      VITE_RELEASE_VERSION: 'production',
      VERCEL_ENV: 'production',
    }))

    expect(errors).toEqual([
      'VITE_API_BASE_URL must point to `/api` or a real API origin, not an example or localhost value.',
      'VITE_SITE_URL must point to the real frontend origin, not an example or localhost value.',
      'VITE_RELEASE_VERSION must be a commit SHA, build number, or semantic version for Vercel deployments.',
      'VITE_OBSERVABILITY_DSN is required when VITE_OBSERVABILITY_ENABLED=true.',
    ])
  })

  it('accepts same-origin API paths for production Vercel builds', () => {
    const errors = validateVercelDeploymentEnv(readDeploymentEnv({
      VITE_API_BASE_URL: '/api',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_SITE_URL: 'https://blog.production.invalid',
      VITE_INDEXING_ENABLED: 'true',
      VITE_OBSERVABILITY_ENABLED: 'false',
      VITE_RELEASE_VERSION: 'abc123def456',
      VERCEL_ENV: 'production',
    }))

    expect(errors).toEqual([])
  })

  it('rejects same-origin API paths that only share the /api prefix', () => {
    const errors = validateVercelDeploymentEnv(readDeploymentEnv({
      VITE_API_BASE_URL: '/apiary',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_SITE_URL: 'https://blog.production.invalid',
      VITE_INDEXING_ENABLED: 'true',
      VITE_OBSERVABILITY_ENABLED: 'false',
      VITE_RELEASE_VERSION: 'abc123def456',
      VERCEL_ENV: 'production',
    }))

    expect(errors).toEqual([
      'VITE_API_BASE_URL must point to `/api` or a real API origin, not an example or localhost value.',
      'VITE_API_BASE_URL must use https:// for production deployments.',
    ])
  })

  it('requires https for absolute production API URLs', () => {
    const errors = validateVercelDeploymentEnv(readDeploymentEnv({
      VITE_API_BASE_URL: 'http://api.production.invalid',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_SITE_URL: 'https://blog.production.invalid',
      VITE_INDEXING_ENABLED: 'true',
      VITE_OBSERVABILITY_ENABLED: 'false',
      VITE_RELEASE_VERSION: 'abc123def456',
      VERCEL_ENV: 'production',
    }))

    expect(errors).toEqual([
      'VITE_API_BASE_URL must use https:// for production deployments.',
    ])
  })

  it('rejects the local development release marker on Vercel builds', () => {
    const errors = validateVercelDeploymentEnv(readDeploymentEnv({
      VITE_API_BASE_URL: '/api',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_SITE_URL: 'https://blog.production.invalid',
      VITE_INDEXING_ENABLED: 'true',
      VITE_OBSERVABILITY_ENABLED: 'false',
      VITE_RELEASE_VERSION: 'local',
      VERCEL_ENV: 'production',
    }))

    expect(errors).toEqual([
      'VITE_RELEASE_VERSION must be a commit SHA, build number, or semantic version for Vercel deployments.',
    ])
  })

  it('rejects example and localhost absolute API URLs on Vercel', () => {
    const baseEnv = {
      VITE_APP_TITLE: 'Blog Platform',
      VITE_SITE_URL: 'https://blog.production.invalid',
      VITE_INDEXING_ENABLED: 'false',
      VITE_OBSERVABILITY_ENABLED: 'false',
      VITE_RELEASE_VERSION: 'abc123def456',
      VERCEL_ENV: 'preview',
    }

    expect(validateVercelDeploymentEnv(readDeploymentEnv({
      ...baseEnv,
      VITE_API_BASE_URL: 'https://api.example.com',
    }))).toEqual([
      'VITE_API_BASE_URL must point to `/api` or a real API origin, not an example or localhost value.',
    ])

    expect(validateVercelDeploymentEnv(readDeploymentEnv({
      ...baseEnv,
      VITE_API_BASE_URL: 'http://localhost:3000',
    }))).toEqual([
      'VITE_API_BASE_URL must point to `/api` or a real API origin, not an example or localhost value.',
    ])
  })

  it('rejects preview builds that allow indexing', () => {
    const errors = validateVercelDeploymentEnv(readDeploymentEnv({
      VITE_API_BASE_URL: 'https://api.preview.invalid',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_SITE_URL: 'https://preview.invalid',
      VITE_INDEXING_ENABLED: 'true',
      VITE_OBSERVABILITY_ENABLED: 'false',
      VITE_RELEASE_VERSION: 'preview-abc123',
      VERCEL_ENV: 'preview',
    }))

    expect(errors).toEqual([
      'Preview deployments must set VITE_INDEXING_ENABLED=false.',
    ])
  })

  it('accepts a safe production deployment configuration', () => {
    const errors = validateVercelDeploymentEnv(readDeploymentEnv({
      VITE_API_BASE_URL: 'https://api.production.invalid',
      VITE_APP_TITLE: 'Blog Platform',
      VITE_SITE_URL: 'https://blog.production.invalid',
      VITE_INDEXING_ENABLED: 'true',
      VITE_OBSERVABILITY_ENABLED: 'true',
      VITE_OBSERVABILITY_DSN: 'https://observability.production.invalid/ingest',
      VITE_RELEASE_VERSION: 'abc123def456',
      VERCEL_ENV: 'production',
    }))

    expect(errors).toEqual([])
  })
})
