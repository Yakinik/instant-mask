import { useEffect, useState } from 'preact/hooks'

import { APP_NAME, APP_TAGLINE } from '@/shared/config/app'
import { Button, Icon } from '@/shared/ui'

import { exportImage } from '../lib/export-image'
import { acceptImageFromDialog, acceptPastedItems } from '../lib/image-input'
import {
  emojiPickerOpen,
  errorMessage,
  image,
  layers,
  redo,
  removeLayer,
  selectLayer,
  selectedLayerId,
  undo,
} from '../model/editor'
import { DropZone } from './DropZone'
import styles from './EditorPage.module.css'
import { EmojiPicker } from './EmojiPicker'
import { Stage } from './Stage'
import { Toolbar } from './Toolbar'

export function EditorPage() {
  const current = image.value
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void acceptPastedItems(event.clipboardData)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, [contenteditable="true"]')
      ) {
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (event.key === 'Escape') {
        selectLayer(null)
        emojiPickerOpen.value = false
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const id = selectedLayerId.value
        if (!id) return
        event.preventDefault()
        removeLayer(id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const save = async () => {
    const target = image.value
    if (!target || saving) return
    setSaving(true)
    try {
      await exportImage(target, layers.value)
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '画像を書き出せませんでした'
    } finally {
      setSaving(false)
    }
  }

  return (
    <div class={styles.page}>
      <header class={styles.header}>
        <div class={styles.brand}>
          <span class={styles.logo} aria-hidden="true">
            🫥
          </span>
          <div class={styles.titles}>
            <h1 class={styles.title}>{APP_NAME}</h1>
            <p class={styles.tagline}>{APP_TAGLINE}</p>
          </div>
        </div>
        <div class={styles.actions}>
          {current && (
            <>
              <Button
                title="画像を変更"
                aria-label="画像を変更"
                onClick={() => void acceptImageFromDialog()}
              >
                <Icon name="image" />
                <span class={styles.actionLabel}>画像を変更</span>
              </Button>
              <Button variant="primary" disabled={saving} onClick={() => void save()}>
                <Icon name="download" />
                {saving ? '書き出し中…' : '画像を保存'}
              </Button>
            </>
          )}
        </div>
      </header>

      {errorMessage.value && (
        <div class={styles.error} role="alert">
          <span>{errorMessage.value}</span>
          <Button
            square
            variant="ghost"
            aria-label="閉じる"
            onClick={() => (errorMessage.value = null)}
          >
            <Icon name="close" />
          </Button>
        </div>
      )}

      <main class={styles.main}>
        {current ? <Stage image={current} /> : <DropZone />}
      </main>

      {current && <Toolbar />}
      <EmojiPicker />
    </div>
  )
}
