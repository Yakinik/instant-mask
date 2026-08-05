import { Button, Slider } from '@/shared/ui'

import { image, openStampPicker, stampStyleOpen, updateLayer } from '../model/editor'
import { type EmojiLayer, measureStampWidth } from '../model/emoji'
import { MIN_LAYER_SIZE } from '../model/layer'
import styles from './Toolbar.module.css'

/** 絵文字・文字の内容とスタイル。マスクの設定群と同じ位置に置く。 */
export function StampSettings({ layer }: { layer: EmojiLayer }) {
  const current = image.value
  const maxSize = current ? Math.round(Math.min(current.width, current.height) * 1.5) : 600

  return (
    <>
      <span class={styles.badge} aria-hidden="true">
        {layer.char}
      </span>
      <Button onClick={() => openStampPicker('edit')}>内容を変更</Button>
      <Button onClick={() => (stampStyleOpen.value = true)}>スタイル</Button>
      <Slider
        class={styles.slider}
        label="大きさ"
        min={MIN_LAYER_SIZE}
        max={maxSize}
        value={Math.round(layer.height)}
        valueText={`${Math.round(layer.height)}px`}
        // 文字は長さで幅が変わるので、大きさを変えたら実際の描画幅を測り直す
        onInput={(size) =>
          updateLayer(layer.id, {
            width: measureStampWidth(layer.char, size),
            height: size,
          })
        }
      />
    </>
  )
}
