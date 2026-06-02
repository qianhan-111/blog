import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

import { readDeploymentEnv, validateVercelDeploymentEnv } from './src/deployment/env'
import {
  createDeploymentAssetsPlugin,
  createDeploymentDefine,
} from './src/deployment/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rawEnv = {
    ...loadEnv(mode, process.cwd(), ''),
    ...process.env,
  }
  const deploymentEnv = readDeploymentEnv(rawEnv)

  if (rawEnv.VERCEL === '1') {
    const errors = validateVercelDeploymentEnv(deploymentEnv)

    if (errors.length > 0) {
      throw new Error([
        'Unsafe Vercel deployment environment:',
        ...errors.map((error) => `- ${error}`),
      ].join('\n'))
    }
  }

  return {
    plugins: [
      vue(),
      createDeploymentAssetsPlugin(deploymentEnv),
    ],
    define: createDeploymentDefine(deploymentEnv),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
