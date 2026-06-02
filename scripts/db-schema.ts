export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let singleQuoted = false
  let doubleQuoted = false
  let lineComment = false
  let blockComment = false
  let dollarQuoteTag = ''

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]
    const next = sql[index + 1] ?? ''
    const rest = sql.slice(index)

    if (lineComment) {
      current += char
      if (char === '\n') {
        lineComment = false
      }
      continue
    }

    if (blockComment) {
      current += char
      if (char === '*' && next === '/') {
        current += next
        index += 1
        blockComment = false
      }
      continue
    }

    if (dollarQuoteTag) {
      if (rest.startsWith(dollarQuoteTag)) {
        current += dollarQuoteTag
        index += dollarQuoteTag.length - 1
        dollarQuoteTag = ''
        continue
      }

      current += char
      continue
    }

    if (!singleQuoted && !doubleQuoted) {
      if (char === '-' && next === '-') {
        current += char + next
        index += 1
        lineComment = true
        continue
      }

      if (char === '/' && next === '*') {
        current += char + next
        index += 1
        blockComment = true
        continue
      }

      const dollarQuoteMatch = rest.match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/)
      if (dollarQuoteMatch) {
        dollarQuoteTag = dollarQuoteMatch[0]
        current += dollarQuoteTag
        index += dollarQuoteTag.length - 1
        continue
      }
    }

    if (char === "'" && !doubleQuoted) {
      current += char
      if (singleQuoted && next === "'") {
        current += next
        index += 1
        continue
      }

      singleQuoted = !singleQuoted
      continue
    }

    if (char === '"' && !singleQuoted) {
      current += char
      doubleQuoted = !doubleQuoted
      continue
    }

    if (char === ';' && !singleQuoted && !doubleQuoted) {
      const statement = current.trim()
      if (statement) {
        statements.push(statement)
      }
      current = ''
      continue
    }

    current += char
  }

  const trailingStatement = current.trim()
  if (trailingStatement) {
    statements.push(trailingStatement)
  }

  return statements
}
