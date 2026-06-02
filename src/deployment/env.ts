export type VercelEnvironment = 'development' | 'preview' | 'production'

export interface DeploymentEnv {
  apiBaseUrl: string
  appTitle: string
  siteUrl: string
  indexingEnabled: boolean
  observabilityEnabled: boolean
  observabilityDsn: string
  releaseVersion: string
  vercelEnv: VercelEnvironment | ''
  vercelUrl: string
}

type RawEnv = Record<string, string | undefined>

const unsafeHostPatterns = [
  /(^|\.)example\.(com|org|net)$/i,
  /(^|\.)localhost$/i,
  /^127\.0\.0\.1$/,
  /^0\.0\.0\.0$/,
]

function trimValue(value: string | undefined): string {
  return value?.trim() ?? ''
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  const normalized = trimValue(value).toLowerCase()

  if (!normalized) {
    return defaultValue
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false
  }

  return defaultValue
}

function normalizeSiteUrl(value: string): string {
  if (!value) {
    return ''
  }

  try {
    const url = new URL(value)
    url.hash = ''
    url.search = ''
    url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString().replace(/\/$/, '')
  } catch {
    return value
  }
}

function getHostname(value: string): string {
  try {
    return new URL(value).hostname
  } catch {
    return ''
  }
}

function isUnsafeOrigin(value: string): boolean {
  const hostname = getHostname(value)

  if (!hostname) {
    return true
  }

  return unsafeHostPatterns.some((pattern) => pattern.test(hostname))
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function isSameOriginPath(value: string): boolean {
  return value === '/api' || value.startsWith('/api/')
}

function normalizeVercelEnvironment(value: string): VercelEnvironment | '' {
  if (value === 'development' || value === 'preview' || value === 'production') {
    return value
  }

  return ''
}

export function readDeploymentEnv(env: RawEnv): DeploymentEnv {
  const vercelEnv = normalizeVercelEnvironment(trimValue(env.VERCEL_ENV))
  const vercelUrl = trimValue(env.VERCEL_URL)
  const vercelProductionUrl = trimValue(env.VERCEL_PROJECT_PRODUCTION_URL)
  const derivedDeploymentSiteUrl = vercelUrl ? `https://${vercelUrl}` : ''
  const derivedProductionSiteUrl = vercelProductionUrl ? `https://${vercelProductionUrl}` : ''
  const derivedSiteUrl =
    vercelEnv === 'production'
      ? derivedProductionSiteUrl || derivedDeploymentSiteUrl
      : derivedDeploymentSiteUrl

  return {
    apiBaseUrl: trimValue(env.VITE_API_BASE_URL),
    appTitle: trimValue(env.VITE_APP_TITLE) || 'Blog Platform',
    siteUrl: normalizeSiteUrl(trimValue(env.VITE_SITE_URL) || derivedSiteUrl),
    indexingEnabled: parseBoolean(env.VITE_INDEXING_ENABLED, vercelEnv === 'production'),
    observabilityEnabled: parseBoolean(env.VITE_OBSERVABILITY_ENABLED, false),
    observabilityDsn: trimValue(env.VITE_OBSERVABILITY_DSN),
    releaseVersion: trimValue(env.VITE_RELEASE_VERSION) || trimValue(env.VERCEL_GIT_COMMIT_SHA),
    vercelEnv,
    vercelUrl,
  }
}

export function validateVercelDeploymentEnv(env: DeploymentEnv): string[] {
  const errors: string[] = []
  const apiBaseUrlIsSameOriginPath = isSameOriginPath(env.apiBaseUrl)

  if (!env.apiBaseUrl || (!apiBaseUrlIsSameOriginPath && isUnsafeOrigin(env.apiBaseUrl))) {
    errors.push('VITE_API_BASE_URL must point to `/api` or a real API origin, not an example or localhost value.')
  }

  if (!env.siteUrl || isUnsafeOrigin(env.siteUrl)) {
    errors.push('VITE_SITE_URL must point to the real frontend origin, not an example or localhost value.')
  }

  if (env.vercelEnv === 'production') {
    if (!apiBaseUrlIsSameOriginPath && !isHttpsUrl(env.apiBaseUrl)) {
      errors.push('VITE_API_BASE_URL must use https:// for production deployments.')
    }

    if (!isHttpsUrl(env.siteUrl)) {
      errors.push('VITE_SITE_URL must use https:// for production deployments.')
    }
  }

  if (!env.releaseVersion || ['dev', 'local', 'test', 'production'].includes(env.releaseVersion)) {
    errors.push('VITE_RELEASE_VERSION must be a commit SHA, build number, or semantic version for Vercel deployments.')
  }

  if (env.observabilityEnabled && !env.observabilityDsn) {
    errors.push('VITE_OBSERVABILITY_DSN is required when VITE_OBSERVABILITY_ENABLED=true.')
  }

  if (env.vercelEnv === 'preview' && env.indexingEnabled) {
    errors.push('Preview deployments must set VITE_INDEXING_ENABLED=false.')
  }

  return errors
}
