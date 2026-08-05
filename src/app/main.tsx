import { render } from 'preact'

import { App } from './App'
import './global.css'

// ページ自体の拡縮は無効にする（画像・領域・文字の拡縮は編集操作として別に用意している）。
// iOS Safari は viewport の user-scalable=no を無視するので、ジェスチャを直接止める。
const preventGesture = (event: Event) => event.preventDefault()
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, preventGesture, { passive: false })
}

const root = document.getElementById('app')
if (root) render(<App />, root)
