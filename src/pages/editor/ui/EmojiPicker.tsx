import { useState } from 'preact/hooks'

import { Button, Icon } from '@/shared/ui'

import { EMOJI_CATEGORIES } from '../config/emoji-presets'
import {
  addLayer,
  emojiPickerOpen,
  image,
  pushHistory,
  selectedLayer,
  updateLayer,
} from '../model/editor'
import { createEmojiLayer, measureStampWidth } from '../model/emoji'
import { MIN_LAYER_SIZE } from '../model/layer'
import styles from './EmojiPicker.module.css'

function close(): void {
  emojiPickerOpen.value = false
}

/** 絵文字レイヤを選択中なら差し替え、そうでなければ画像の中央に追加する。 */
function place(text: string): void {
  const value = text.trim()
  if (!value) return
  const current = image.value
  if (!current) return
  const selected = selectedLayer.value
  if (selected?.kind === 'emoji') {
    pushHistory()
    updateLayer(selected.id, {
      char: value,
      width: measureStampWidth(value, selected.height),
    })
  } else {
    const size = Math.max(MIN_LAYER_SIZE, Math.min(current.width, current.height) / 4)
    addLayer(createEmojiLayer(value, current.width / 2, current.height / 2, size))
  }
  close()
}

export function EmojiPicker() {
  const [text, setText] = useState('')

  if (!emojiPickerOpen.value) return null

  const submit = () => {
    place(text)
    setText('')
  }

  return (
    <div class={styles.backdrop} onClick={close}>
      <div
        class={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="絵文字や文字を追加"
        onClick={(event) => event.stopPropagation()}
      >
        <div class={styles.head}>
          <strong>絵文字・文字を追加</strong>
          <Button square variant="ghost" aria-label="閉じる" onClick={close}>
            <Icon name="close" />
          </Button>
        </div>

        <form
          class={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <input
            class={styles.input}
            type="text"
            value={text}
            enterkeyhint="done"
            autocomplete="off"
            placeholder="絵文字や文字を入力"
            aria-label="入力した文字を追加"
            onInput={(event) => setText(event.currentTarget.value)}
          />
          <Button variant="primary" type="submit" disabled={text.trim().length === 0}>
            追加
          </Button>
        </form>

        <div class={styles.body}>
          {EMOJI_CATEGORIES.map((category) => (
            <section key={category.name}>
              <h2 class={styles.category}>{category.name}</h2>
              <div class={styles.grid}>
                {category.items.map((char) => (
                  <button
                    key={char}
                    type="button"
                    class={styles.emoji}
                    title={char}
                    onClick={() => place(char)}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
