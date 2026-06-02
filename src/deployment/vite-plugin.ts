import type { Plugin } from 'vite'

import type { DeploymentEnv } from './env'
import {
  buildRobotsTxt,
  buildSitemapXml,
} from './seo-assets'

export function createDeploymentDefine(env: DeploymentEnv): Record<string, string> {
  return {
    'import.meta.env.VITE_RELEASE_VERSION': JSON.stringify(env.releaseVersion),
  }
}

export function createDeploymentAssetsPlugin(env: DeploymentEnv): Plugin {
  return {
    name: 'deployment-assets',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: buildRobotsTxt(env),
      })

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: buildSitemapXml(env),
      })
    },
  }
}
