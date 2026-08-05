import { Button, Icon, Slider } from '@/shared/ui'

import {
  selectedLayer,
  stampStyle,
  stampStyleOpen,
  updateLayer,
} from '../model/editor'
import { DEFAULT_STAMP_STYLE, type StampStyle } from '../model/emoji'
import styles from './StampStyleDialog.module.css'

function close(): void {
  stampStyleOpen.value = false
}

export function StampStyleDialog() {
  if (!stampStyleOpen.value) return null

  // 絵文字・文字を選択中ならそのレイヤを、そうでなければ次に作るものの既定を編集する
  const selected = selectedLayer.value
  const target = selected?.kind === 'emoji' ? selected : null
  const style: StampStyle = target?.style ?? stampStyle.value

  const update = (patch: Partial<StampStyle>) => {
    if (target) updateLayer(target.id, { style: { ...target.style, ...patch } })
    else stampStyle.value = { ...stampStyle.value, ...patch }
  }

  return (
    <div class={styles.backdrop} onClick={close}>
      <div
        class={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="文字のスタイル"
        onClick={(event) => event.stopPropagation()}
      >
        <div class={styles.head}>
          <strong>{target ? '文字のスタイル' : '文字のスタイル（既定）'}</strong>
          <Button square variant="ghost" aria-label="閉じる" onClick={close}>
            <Icon name="close" />
          </Button>
        </div>

        <div class={styles.body}>
          <p class={styles.note}>
            絵文字には文字色は効きませんが、透過度とアウトラインは反映されます。
          </p>

          <label class={styles.row}>
            <span>文字の色</span>
            <input
              type="color"
              class={styles.color}
              value={style.color}
              onInput={(event) => update({ color: event.currentTarget.value })}
            />
          </label>
          <Slider
            label="文字の不透明度"
            min={0}
            max={100}
            value={style.opacity}
            valueText={`${style.opacity}%`}
            onInput={(opacity) => update({ opacity })}
          />

          <label class={styles.row}>
            <span>アウトラインの色</span>
            <input
              type="color"
              class={styles.color}
              value={style.strokeColor}
              onInput={(event) => update({ strokeColor: event.currentTarget.value })}
            />
          </label>
          <Slider
            label="アウトラインの太さ"
            min={0}
            max={40}
            value={style.strokeWidth}
            valueText={style.strokeWidth === 0 ? 'なし' : `${style.strokeWidth}%`}
            onInput={(strokeWidth) => update({ strokeWidth })}
          />
          <Slider
            label="アウトラインの不透明度"
            min={0}
            max={100}
            value={style.strokeOpacity}
            valueText={`${style.strokeOpacity}%`}
            onInput={(strokeOpacity) => update({ strokeOpacity })}
          />

          <div class={styles.foot}>
            <Button
              variant="ghost"
              onClick={() => update({ ...DEFAULT_STAMP_STYLE })}
            >
              既定に戻す
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
