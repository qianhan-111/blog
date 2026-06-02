export function parsePositiveRouteInteger(value: unknown): number | null {
  const rawValue = Array.isArray(value) ? value[0] : value

  if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
    return null
  }

  const text = String(rawValue)

  if (!/^\d+$/.test(text)) {
    return null
  }

  const parsed = Number(text)

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}
