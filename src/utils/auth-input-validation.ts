function containsUnsafeControlCharacter(value: string) {
  for (const character of value) {
    const code = character.charCodeAt(0)

    if ((code >= 0 && code <= 31) || code === 127) {
      return true
    }
  }

  return false
}

export function getUnsafeAuthInputMessage(value: string, fieldLabel: string) {
  if (!value.trim()) {
    return ''
  }

  return containsUnsafeControlCharacter(value) || /[<>]|\bnull\b/i.test(value)
    ? `${fieldLabel}包含不安全字符`
    : ''
}
