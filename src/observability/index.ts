import type { App } from 'vue'

interface ObservabilityOptions {
  enabled: boolean
  endpoint?: string
  release?: string
  router?: {
    currentRoute?: {
      value?: {
        fullPath?: string
      }
    }
    onError?: (handler: (error: Error) => void) => unknown
  }
}

interface HttpFailureReport {
  code?: number
  kind: string
  message: string
  retryable: boolean
  shouldReport: boolean
  status?: number
}

interface EventContext {
  [key: string]: unknown
}

interface ObservabilityState {
  enabled: boolean
  endpoint: string
  release?: string
}

const state: ObservabilityState = {
  enabled: false,
  endpoint: '',
  release: undefined,
}

function normalizeError(caughtError: unknown) {
  if (caughtError instanceof Error) {
    return caughtError
  }

  if (typeof caughtError === 'string' && caughtError.trim()) {
    return new Error(caughtError)
  }

  return new Error('未知异常')
}

function configureObservability(options: ObservabilityOptions) {
  state.enabled = options.enabled
  state.endpoint = options.endpoint?.trim() || ''
  state.release = options.release?.trim() || undefined
}

function canReport() {
  return state.enabled && Boolean(state.endpoint)
}

function sendEvent(event: string, message: string, context: EventContext = {}) {
  if (!canReport()) {
    return
  }

  void fetch(state.endpoint, {
    body: JSON.stringify({
      context,
      event,
      message,
      release: state.release,
      timestamp: new Date().toISOString(),
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true,
    method: 'POST',
  }).catch(() => undefined)
}

export function initObservability(app: App, options: ObservabilityOptions) {
  configureObservability(options)

  app.config.errorHandler = (error, _instance, info) => {
    const normalizedError = normalizeError(error)

    sendEvent('runtime_error', normalizedError.message, {
      info,
      source: 'vue',
    })
  }

  if (typeof window === 'undefined') {
    return
  }

  window.addEventListener('error', (event) => {
    const normalizedError = normalizeError(event.error ?? event.message)

    sendEvent('runtime_error', normalizedError.message, {
      colno: event.colno,
      filename: event.filename,
      lineno: event.lineno,
      source: 'window.error',
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const normalizedError = normalizeError(event.reason)

    sendEvent('runtime_error', normalizedError.message, {
      source: 'window.unhandledrejection',
    })
  })

  options.router?.onError?.((error) => {
    reportRouteError(error, {
      to: options.router?.currentRoute?.value?.fullPath,
    })
  })
}

export function reportHttpFailure(error: HttpFailureReport, context: EventContext = {}) {
  if (!error.shouldReport) {
    return
  }

  sendEvent('http_failure', error.message, {
    ...context,
    code: error.code,
    kind: error.kind,
    retryable: error.retryable,
    status: error.status,
  })
}

export function reportRouteError(caughtError: unknown, context: EventContext = {}) {
  const normalizedError = normalizeError(caughtError)

  sendEvent('route_error', normalizedError.message, context)
}
