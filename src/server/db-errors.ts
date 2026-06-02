export function getDatabaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const code = (error as { code?: unknown }).code

  return typeof code === 'string' ? code : null
}

export function isUniqueConstraintError(error: unknown): boolean {
  return getDatabaseErrorCode(error) === '23505'
}

export function isForeignKeyConstraintError(error: unknown): boolean {
  return getDatabaseErrorCode(error) === '23503'
}
