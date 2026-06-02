// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function collectFiles(root: string, extensions: string[]): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)

    if (entry.isDirectory()) {
      return collectFiles(path, extensions)
    }

    return extensions.some((extension) => path.endsWith(extension)) ? [path] : []
  })
}

describe('test runner configuration', () => {
  it('keeps coverage output directories separate across test scripts', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>
    }
    const unitConfig = readFileSync('vitest.config.ts', 'utf8')
    const backendConfig = readFileSync('vitest.backend.config.ts', 'utf8')
    const smokeConfig = readFileSync('vitest.smoke.config.ts', 'utf8')

    expect(packageJson.scripts['test:smoke']).toBe('vitest run --config vitest.smoke.config.ts')
    expect(unitConfig).toContain("reportsDirectory: 'coverage/unit'")
    expect(backendConfig).toContain("reportsDirectory: 'coverage/backend'")
    expect(smokeConfig).toContain("reportsDirectory: 'coverage/smoke'")
  })

  it('keeps generated handoff output out of test discovery', () => {
    const unitConfig = readFileSync('vitest.config.ts', 'utf8')
    const backendConfig = readFileSync('vitest.backend.config.ts', 'utf8')
    const smokeConfig = readFileSync('vitest.smoke.config.ts', 'utf8')

    for (const config of [unitConfig, backendConfig, smokeConfig]) {
      expect(config).toContain("'output/**'")
    }
  })

  it('keeps GitHub Actions on the same Node major as package engines', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      engines?: { node?: string }
    }
    const workflow = readFileSync('.github/workflows/quality-gate.yml', 'utf8')

    expect(packageJson.engines?.node).toBe('24.x')
    expect(workflow).toContain('node-version: 24')
    expect(workflow).not.toContain('node-version: 20')
  })

  it('keeps Vercel request types local instead of depending on the Vercel builder package', () => {
    const vercelNodePackage = ['@vercel', 'node'].join('/')
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const packageLock = readFileSync('package-lock.json', 'utf8')
    const source = ['src', 'api', 'tests'].flatMap((root) => collectFiles(root, ['.ts', '.vue'])).map((path) =>
      readFileSync(path, 'utf8'),
    )

    expect(packageJson.dependencies).not.toHaveProperty(vercelNodePackage)
    expect(packageJson.devDependencies).not.toHaveProperty(vercelNodePackage)
    expect(packageLock).not.toContain(`"${vercelNodePackage}"`)
    expect(source.join('\n')).not.toContain(vercelNodePackage)
  })

  it('keeps test utility transitive dependencies on maintained versions', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      overrides?: {
        'js-beautify'?: {
          glob?: string
        }
      }
    }

    expect(packageJson.overrides?.['js-beautify']?.glob).toBe('^13.0.6')
  })

  it('runs GitHub Actions quality gates on common default branches', () => {
    const workflow = readFileSync('.github/workflows/quality-gate.yml', 'utf8')

    expect(workflow).toContain('      - master')
    expect(workflow).toContain('      - main')
  })

  it('provides a handoff package command that excludes local and ignored files', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>
    }
    const handoffScript = readFileSync('scripts/create-handoff-package.ps1', 'utf8')
    const gitignore = readFileSync('.gitignore', 'utf8')
    const handoffDocs = [
      readFileSync('README.md', 'utf8'),
      readFileSync('docs/release-preflight-checklist.md', 'utf8'),
      readFileSync('docs/zero-basic-vercel-deployment-tutorial.md', 'utf8'),
      readFileSync('docs/给同学的交接文档/01-文件接收入手教程.md', 'utf8'),
      readFileSync('docs/给同学的交接文档/02-后续部署配置教程.md', 'utf8'),
    ].join('\n')
    const chineseHandoffGuideDirectory = 'docs/给同学的交接文档'

    expect(packageJson.scripts['package:handoff']).toBe('powershell -ExecutionPolicy Bypass -File scripts/create-handoff-package.ps1')
    expect(handoffScript).toContain('git -c core.quotepath=false ls-files --cached --others --exclude-standard')
    expect(handoffScript).toContain('core.quotepath=false')
    expect(handoffScript).toContain('Compress-Archive')
    expect(handoffScript).toContain('finally')
    expect(handoffScript).toContain('Remove-Item -LiteralPath $stagingRoot -Recurse -Force')
    expect(handoffScript).not.toContain('TrimStart("./")')

    for (const excludedPath of [
      '.git',
      'node_modules',
      'dist',
      'coverage',
      '.vercel',
      '.playwright-cli',
      'output',
      '.trae',
      '.env',
      '.env.local',
      'docs/plans',
      'docs/superpowers',
    ]) {
      expect(handoffScript).toContain(excludedPath)
    }

    expect(handoffScript).not.toContain('".env.development"')
    expect(handoffScript).not.toContain('".env.production"')
    expect(handoffScript).not.toContain('".env.test"')
    expect(handoffScript).toContain('.env.*.local')
    expect(handoffScript).not.toContain(chineseHandoffGuideDirectory)
    expect(gitignore).toContain('!docs/给同学的交接文档/')
    expect(gitignore).toContain('!docs/给同学的交接文档/**')
    expect(handoffDocs).toContain('npm run package:handoff')
    expect(handoffDocs).toContain('.env.*.local')
    expect(handoffDocs).toContain('01-文件接收入手教程.md')
    expect(handoffDocs).toContain('02-后续部署配置教程.md')
    expect(handoffDocs).toContain(chineseHandoffGuideDirectory)
    expect(handoffDocs).not.toContain('`.env.development`')
    expect(handoffDocs).not.toContain('`.env.production`')
    expect(handoffDocs).not.toContain('`.env.test`')
  })
})
