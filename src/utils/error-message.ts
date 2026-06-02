const COMMON_ERROR_MESSAGES: Record<string, string> = {
  'Failed to load articles': '文章加载失败',
  'Failed to load categories': '分类加载失败',
  'Failed to load tags': '标签加载失败',
  'Network Error': '网络连接失败，请检查网络或后端服务',
  'Failed to fetch': '网络连接失败，请检查网络或后端服务',
  'Server unavailable': '服务暂时不可用，请稍后重试',
}

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: '请求参数有误，请检查后重试',
  401: '登录已失效，请重新登录',
  403: '无权限执行该操作',
  404: '请求的内容不存在',
  409: '操作冲突，请刷新后重试',
  422: '提交内容校验未通过',
  429: '操作过于频繁，请稍后重试',
}

function normalizeHttpStatusMessage(status: number) {
  if (HTTP_STATUS_MESSAGES[status]) {
    return HTTP_STATUS_MESSAGES[status]
  }

  if (status >= 500) {
    return '服务暂时不可用，请稍后重试'
  }

  return '请求失败，请稍后重试'
}

function isStructuredError(caughtError: unknown): caughtError is { kind?: string; retryable?: boolean } {
  return typeof caughtError === 'object' && caughtError !== null
}

export function normalizeErrorMessage(caughtError: unknown, fallback: string) {
  if (!(caughtError instanceof Error)) {
    return fallback
  }

  const message = caughtError.message.trim()

  if (!message) {
    return fallback
  }

  if (COMMON_ERROR_MESSAGES[message]) {
    return COMMON_ERROR_MESSAGES[message]
  }

  if (/network|err_network/i.test(message)) {
    return '网络连接失败，请检查网络或后端服务'
  }

  if (/timeout/i.test(message)) {
    return '请求超时，请稍后重试'
  }

  const statusMatch = message.match(/status code (\d{3})/i)

  if (statusMatch) {
    return normalizeHttpStatusMessage(Number(statusMatch[1]))
  }

  return message
}

export function getRecoveryMessage(caughtError: unknown) {
  if (!isStructuredError(caughtError)) {
    return ''
  }

  if (caughtError.kind === 'timeout') {
    return '可稍后重试，若持续失败请检查网络连接'
  }

  if (caughtError.kind === 'network') {
    return '请检查网络或服务状态后重试'
  }

  if (caughtError.retryable === true) {
    return '请稍后重试'
  }

  return ''
}

export function getAuthRecoveryMessage(caughtError: unknown) {
  return getRecoveryMessage(caughtError)
}
