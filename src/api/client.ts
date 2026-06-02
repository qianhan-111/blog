import axios, {
  AxiosHeaders,
  AxiosError,
  type AxiosDefaults,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

import type { ApiResponse } from '@/types/api'
import { reportHttpFailure } from '@/observability'
import {
  clearAdminToken,
  clearUserToken,
  getAuthToken,
} from '@/utils/auth-storage'
import { normalizeErrorMessage } from '@/utils/error-message'

export type HttpClientMode = 'public' | 'user' | 'admin'
export type HttpErrorKind = 'business' | 'canceled' | 'http' | 'network' | 'timeout'

const DEFAULT_READ_TIMEOUT_MS = 10_000
const DEFAULT_WRITE_TIMEOUT_MS = 15_000

type RequestConfig<D = unknown> = AxiosRequestConfig<D> & {
  authMode?: HttpClientMode
}

type InternalRequestConfig<D = unknown> = InternalAxiosRequestConfig<D> & {
  authMode?: HttpClientMode
  authTokenAtRequest?: string | null
}

export class HttpClientError extends Error {
  code?: number
  kind: HttpErrorKind
  retryable: boolean
  shouldReport: boolean
  staleAuthFailure: boolean
  status?: number

  constructor(options: {
    code?: number
    kind: HttpErrorKind
    message: string
    retryable: boolean
    shouldReport: boolean
    staleAuthFailure?: boolean
    status?: number
  }) {
    super(options.message)
    this.name = 'HttpClientError'
    this.code = options.code
    this.kind = options.kind
    this.retryable = options.retryable
    this.shouldReport = options.shouldReport
    this.staleAuthFailure = options.staleAuthFailure ?? false
    this.status = options.status
  }
}

export interface HttpClient {
  defaults: AxiosDefaults
  delete<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  get<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  head<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  options<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  patch<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  post<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  put<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  request<T = unknown, D = unknown>(config: AxiosRequestConfig<D>): Promise<T>
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

function isSafeUserRedirectPath(path: string) {
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    (path === '/profile' ||
      path.startsWith('/profile?') ||
      path === '/writer' ||
      path.startsWith('/writer/') ||
      path.startsWith('/writer?'))
  )
}

function isSafeAdminRedirectPath(path: string) {
  return (
    path.startsWith('/admin') &&
    !path.startsWith('//') &&
    path !== '/admin/login' &&
    !path.startsWith('/admin/login?') &&
    (path === '/admin' || path.startsWith('/admin/') || path.startsWith('/admin?'))
  )
}

function buildLoginPath(mode: Exclude<HttpClientMode, 'public'>) {
  const loginPath = mode === 'admin' ? '/admin/login' : '/login'
  const currentPath = `${window.location.pathname}${window.location.search}`
  const canPreserveRedirect = mode === 'admin'
    ? isSafeAdminRedirectPath(currentPath)
    : isSafeUserRedirectPath(currentPath)

  if (!canPreserveRedirect) {
    return loginPath
  }

  const params = new URLSearchParams({ redirect: currentPath })
  return `${loginPath}?${params.toString()}`
}

function handleConfirmedAuthExpiration(mode: HttpClientMode) {
  if (typeof window === 'undefined') {
    return
  }

  if (mode === 'admin') {
    clearAdminToken()
    replaceBrowserLocation(buildLoginPath(mode))
    return
  }

  if (mode === 'user') {
    clearUserToken()
    replaceBrowserLocation(buildLoginPath(mode))
  }
}

function isConfirmedAuthExpiration(options: {
  code?: number
  message?: string
  status?: number
}) {
  if (options.status === 401 || options.code === 401) {
    return true
  }

  return (
    (options.status === 403 || options.code === 403) &&
    /账号.*禁用/.test(options.message ?? '')
  )
}

function isAuthFailureForCurrentToken(mode: HttpClientMode, requestToken: string | null | undefined) {
  if (mode === 'public' || requestToken === undefined) {
    return true
  }

  return getAuthToken(mode) === requestToken
}

function replaceBrowserLocation(path: string): void {
  window.history.replaceState({}, '', path)
  const event = typeof PopStateEvent === 'function'
    ? new PopStateEvent('popstate', { state: window.history.state })
    : new Event('popstate')

  window.dispatchEvent(event)
}

function setAuthorizationHeader(config: InternalRequestConfig, token: string | null): void {
  if (!token) {
    return
  }

  const headers = AxiosHeaders.from(config.headers)
  headers.set('Authorization', `Bearer ${token}`)
  config.headers = headers
}

function getDefaultTimeout(method?: string) {
  const normalizedMethod = method?.toLowerCase()

  if (normalizedMethod === 'get' || normalizedMethod === 'head' || normalizedMethod === 'options') {
    return DEFAULT_READ_TIMEOUT_MS
  }

  return DEFAULT_WRITE_TIMEOUT_MS
}

function buildHttpClientError(options: {
  code?: number
  fallbackMessage?: string
  kind: HttpErrorKind
  rawError?: unknown
  retryable: boolean
  shouldReport: boolean
  staleAuthFailure?: boolean
  status?: number
}) {
  return new HttpClientError({
    code: options.code,
    kind: options.kind,
    message:
      options.fallbackMessage ||
      normalizeErrorMessage(options.rawError, '请求失败，请稍后重试'),
    retryable: options.retryable,
    shouldReport: options.shouldReport,
    staleAuthFailure: options.staleAuthFailure,
    status: options.status,
  })
}

function isApiResponsePayload(value: unknown): value is ApiResponse<unknown> {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Partial<ApiResponse<unknown>>

  return typeof payload.code === 'number' && typeof payload.message === 'string' && 'data' in payload
}

function getApiResponseCode(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const code = (value as Partial<ApiResponse<unknown>>).code

  return typeof code === 'number' ? code : undefined
}

function getApiResponseMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const message = (value as Partial<ApiResponse<unknown>>).message

  return typeof message === 'string' && message.trim() ? message : undefined
}

function rejectWithReportedError(error: HttpClientError, context: { method?: string; url?: string }) {
  reportHttpFailure(error, context)
  return Promise.reject(error)
}

http.interceptors.request.use((config: InternalRequestConfig) => {
  const authMode = config.authMode ?? 'public'
  const token = authMode === 'public' ? null : getAuthToken(authMode)

  config.authTokenAtRequest = token
  setAuthorizationHeader(config, token)

  if (typeof config.timeout !== 'number' || config.timeout <= 0) {
    config.timeout = getDefaultTimeout(config.method)
  }

  return config
})

http.interceptors.response.use((response: AxiosResponse<ApiResponse<unknown>>) => {
  const requestContext = {
    method: response.config.method,
    url: response.config.url,
  }

  if (!isApiResponsePayload(response.data)) {
    return rejectWithReportedError(buildHttpClientError({
      fallbackMessage: '请求失败，请稍后重试',
      kind: 'http',
      retryable: true,
      shouldReport: true,
      status: response.status,
    }), requestContext)
  }

  const { code, message } = response.data
  const config = response.config as InternalRequestConfig
  const authMode = config.authMode ?? 'public'

  if (authMode !== 'public' && isConfirmedAuthExpiration({ code, message, status: response.status })) {
    const authFailureForCurrentToken = isAuthFailureForCurrentToken(authMode, config.authTokenAtRequest)

    if (authFailureForCurrentToken) {
      handleConfirmedAuthExpiration(authMode)
    }

    throw buildHttpClientError({
      code,
      fallbackMessage: message,
      kind: 'business',
      retryable: false,
      shouldReport: false,
      staleAuthFailure: !authFailureForCurrentToken,
      status: response.status,
    })
  }

  if (code !== 0) {
    throw buildHttpClientError({
      code,
      fallbackMessage: message,
      kind: 'business',
      retryable: false,
      shouldReport: false,
      status: response.status,
    })
  }

  return response
}, (error: AxiosError<ApiResponse<unknown>>) => {
  const config = error.config as InternalRequestConfig | undefined
  const authMode = config?.authMode ?? 'public'
  const responseStatus = error.response?.status
  const responseCode = getApiResponseCode(error.response?.data)
  const responseMessage = getApiResponseMessage(error.response?.data)
  const requestContext = {
    method: error.config?.method,
    url: error.config?.url,
  }

  const confirmedAuthExpiration =
    authMode !== 'public' &&
    isConfirmedAuthExpiration({
      code: responseCode,
      message: responseMessage,
      status: responseStatus,
    })

  const authFailureForCurrentToken = isAuthFailureForCurrentToken(authMode, config?.authTokenAtRequest)

  if (confirmedAuthExpiration && authFailureForCurrentToken) {
    handleConfirmedAuthExpiration(authMode)
  }

  if (error.code === 'ERR_CANCELED') {
    return rejectWithReportedError(buildHttpClientError({
      code: responseCode,
      fallbackMessage: '请求已取消',
      kind: 'canceled',
      retryable: false,
      shouldReport: false,
      status: responseStatus,
    }), requestContext)
  }

  if (error.code === 'ECONNABORTED') {
    return rejectWithReportedError(buildHttpClientError({
      code: responseCode,
      fallbackMessage: responseMessage || '请求超时，请稍后重试',
      kind: 'timeout',
      rawError: error,
      retryable: true,
      shouldReport: true,
      status: responseStatus,
    }), requestContext)
  }

  if (error.code === 'ERR_NETWORK') {
    return rejectWithReportedError(buildHttpClientError({
      code: responseCode,
      kind: 'network',
      rawError: error,
      retryable: true,
      shouldReport: true,
      status: responseStatus,
    }), requestContext)
  }

  return rejectWithReportedError(buildHttpClientError({
    code: responseCode,
    fallbackMessage: responseMessage,
    kind: responseStatus ? 'http' : 'network',
    rawError: error,
    retryable: responseStatus != null ? responseStatus >= 500 || responseStatus === 429 : true,
    shouldReport: responseStatus == null || responseStatus >= 500,
    staleAuthFailure: confirmedAuthExpiration && !authFailureForCurrentToken,
    status: responseStatus,
  }), requestContext)
})

function withMode<D>(mode: HttpClientMode, config?: AxiosRequestConfig<D>): RequestConfig<D> {
  return {
    ...config,
    authMode: mode,
  }
}

async function unwrapResponse<T>(request: Promise<AxiosResponse<ApiResponse<T>>>): Promise<T> {
  const response = await request

  return response.data.data
}

export function createHttpClient(mode: HttpClientMode): HttpClient {
  return {
    defaults: http.defaults,
    delete: <T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>) =>
      unwrapResponse(http.delete<ApiResponse<T>>(url, withMode(mode, config))),
    get: <T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>) =>
      unwrapResponse(http.get<ApiResponse<T>>(url, withMode(mode, config))),
    head: <T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>) =>
      unwrapResponse(http.head<ApiResponse<T>>(url, withMode(mode, config))),
    options: <T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>) =>
      unwrapResponse(http.options<ApiResponse<T>>(url, withMode(mode, config))),
    patch: <T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>) =>
      unwrapResponse(http.patch<ApiResponse<T>>(url, data, withMode(mode, config))),
    post: <T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>) =>
      unwrapResponse(http.post<ApiResponse<T>>(url, data, withMode(mode, config))),
    put: <T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>) =>
      unwrapResponse(http.put<ApiResponse<T>>(url, data, withMode(mode, config))),
    request: <T = unknown, D = unknown>(config: AxiosRequestConfig<D>) =>
      unwrapResponse(http.request<ApiResponse<T>>(withMode(mode, config))),
  }
}
