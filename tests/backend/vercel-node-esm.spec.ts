// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const vercelFunctionSourceRoots = ['api', 'src/server']

function collectTypeScriptFiles(root: string): string[] {
  if (!existsSync(root)) {
    return []
  }

  const entries = readdirSync(root)
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(root, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...collectTypeScriptFiles(fullPath))
    } else if (fullPath.endsWith('.ts')) {
      files.push(fullPath)
    }
  }

  return files
}

function collectExtensionlessRelativeImports(filePath: string): string[] {
  const sourceText = readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
  const violations: string[] = []

  function inspectModuleSpecifier(specifier: ts.Expression | undefined) {
    if (!specifier || !ts.isStringLiteral(specifier)) {
      return
    }

    const value = specifier.text

    if (value.startsWith('.') && path.extname(value) === '') {
      violations.push(`${filePath}: ${value}`)
    }
  }

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      inspectModuleSpecifier(node.moduleSpecifier)
    } else if (ts.isExportDeclaration(node)) {
      inspectModuleSpecifier(node.moduleSpecifier)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      inspectModuleSpecifier(node.arguments[0])
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return violations
}

describe('Vercel Node.js ESM compatibility', () => {
  it('uses explicit .js extensions for relative imports in deployed API code', () => {
    const files = vercelFunctionSourceRoots.flatMap(collectTypeScriptFiles)
    const violations = files.flatMap(collectExtensionlessRelativeImports)

    expect(violations).toEqual([])
  })
})
