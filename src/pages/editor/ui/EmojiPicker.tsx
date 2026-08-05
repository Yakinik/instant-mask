import { useState } from 'preact/hooks'

import { Button, Icon } from '@/shared/ui'

import { EMOJI_CATEGORIES } from '../config/emoji-presets'
import {
  addLayer,
  emojiPickerOpen,
  image,
  pushHistory,
  selectedLayer,
  stampStyle,
  stampStyleOpen,
  updateLayer,
} from '../model/editor'
import { createEmojiLayer, measureStampWidth } from '../model/emoji'
import { MIN_LAYER_SIZE } from '../model/layer'
import { rememberStamp, stampHistory } from '../model/stamp-history'
import styles from './EmojiPicker.module.css'

function close(): void {
  emojiPickerOpen.value = false
}

/**
 * 絵文字・文字レイヤを選択中なら差し替え、そうでなければ画像の中央に追加する。
 * 入力欄から来たものは履歴に残す（一覧に並んでいるプリセットは残さない）。
 */
function place(text: string, remember: boolean): void {
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
    addLayer(
      createEmojiLayer(
        value,
        current.width / 2,
        current.height / 2,
        size,
        stampStyle.value,
      ),
    )
  }
  if (remember) rememberStamp(value)
  close()
}

export function EmojiPicker() {
  const [text, setText] = useState('')

  if (!emojiPickerOpen.value) return null

  const submit = () => {
    place(text, true)
    setText('')
  }
  const recent = stampHistory.value

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
          {recent.length > 0 && (
            <section>
              <h2 class={styles.category}>最近使ったもの</h2>
              <div class={styles.recentList}>
                {recent.map((item) => (
                  <button
                    key={item}
                    type="button"
                    class={styles.recentItem}
                    title={item}
                    onClick={() => place(item, false)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
          )}

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
                    onClick={() => place(char, false)}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div class={styles.foot}>
          <Button
            variant="ghost"
            onClick={() => {
              emojiPickerOpen.value = false
              stampStyleOpen.value = true
            }}
          >
            文字のスタイル…
          </Button>
        </div>
      </div>
    </div>
  )
}
