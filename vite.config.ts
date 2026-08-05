import { fileURLToPath } from 'node:url'
import { type UserConfig, defineConfig } from 'vite'

// GitHub Pages serves this project from https://<owner>.github.io/instant-mask/
const BASE = '/instant-mask/'

export default defineConfig(({ command }): UserConfig => ({
  base: command === 'build' ? BASE : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Preact JSX through Oxc — no Babel, no extra plugin.
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: 'preact',
    },
  },
  css: {
    modules: {
      generateScopedName:
        command === 'build' ? '[hash:base64:5]' : '[name]__[local]',
    },
  },
  build: {
    target: 'es2022',
    cssTarget: 'chrome111',
    assetsInlineLimit: 4096,
    reportCompressedSize: true,
  },
}))
