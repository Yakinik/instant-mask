import { useState } from 'preact/hooks'

import { cx } from '@/shared/lib'
import { Icon } from '@/shared/ui'

import { acceptDroppedFiles, acceptImageFromDialog } from '../lib/image-input'
import styles from './DropZone.module.css'

export function DropZone() {
  const [dragging, setDragging] = useState(false)

  return (
    <div class={styles.wrap}>
      <button
        type="button"
        class={cx(styles.zone, dragging && styles.dragging)}
        onClick={() => void acceptImageFromDialog()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void acceptDroppedFiles(event.dataTransfer)
        }}
      >
        <Icon name="image" size={40} />
        <span class={styles.title}>画像をドロップ、またはクリックして選択</span>
        <span class={styles.hint}>⌘V / Ctrl+V で貼り付けもできます</span>
      </button>
      <p class={styles.note}>
        読み込んだ画像はブラウザの中だけで処理されます。サーバーには送信されません。
      </p>
    </div>
  )
}
