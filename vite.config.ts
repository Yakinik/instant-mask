import { fileURLToPath } from 'node:url'
import { type UserConfig, defineConfig } from 'vite'

// GitHub Pages serves this project from https://<owner>.github.io/instant-mask/
const BASE = '/instant-mask/'

// MIT requires the copyright notice and permission notice to travel with every
// copy of the software. preact ships its ESM build without a license header, so
// the bundle would carry none unless we prepend one here. The projects below all
// use the same MIT text, so it is quoted once.
const NOTICE = `/*!
 * Instant Mask — Copyright (c) 2026 Yakinik
 * https://github.com/Yakinik/instant-mask
 *
 * Bundled third-party code:
 *   preact — Copyright (c) 2015-present Jason Miller
 *   @preact/signals, @preact/signals-core — Copyright (c) 2022-present Preact Team
 *
 * All of the above, and Instant Mask itself, are released under the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */`

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
    cssTarget: ['chrome111', 'safari16.4'],
    assetsInlineLimit: 4096,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        banner: NOTICE,
        // Vite turns legal comments off whenever minification is on, which would
        // strip the notice above. Keep them; drop the rest.
        comments: { legal: true },
      },
    },
  },
}))
