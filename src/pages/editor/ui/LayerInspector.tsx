import { Button, Icon, SegmentedControl, Slider } from '@/shared/ui'

import {
  EFFECT_OPTIONS,
  SHAPE_OPTIONS,
  SOFTNESS_MAX,
  SOFTNESS_MIN,
  STRENGTH_MAX,
  STRENGTH_MIN,
} from '../config/mask-options'
import {
  emojiPickerOpen,
  image,
  layers,
  moveLayer,
  pushHistory,
  removeLayer,
  selectedLayerIndex,
  updateLayer,
} from '../model/editor'
import { measureStampWidth } from '../model/emoji'
import { MIN_LAYER_SIZE, type Layer } from '../model/layer'
import styles from './LayerInspector.module.css'

export function LayerInspector({ layer }: { layer: Layer }) {
  const current = image.value
  const maxEmojiSize = current
    ? Math.round(Math.min(current.width, current.height) * 1.5)
    : 600
  // 配列の末尾ほど前面。端では移動ボタンを無効にする
  const index = selectedLayerIndex.value

  return (
    <>
      {layer.kind === 'mask' ? (
        <>
          <SegmentedControl
            label="効果"
            options={EFFECT_OPTIONS}
            value={layer.effect}
            onChange={(effect) => {
              pushHistory()
              updateLayer(layer.id, { effect })
            }}
          />
          <SegmentedControl
            label="形"
            options={SHAPE_OPTIONS}
            value={layer.shape}
            onChange={(shape) => {
              pushHistory()
              updateLayer(layer.id, { shape })
            }}
          />
          {/* 連続的に変わる値なので履歴には積まない */}
          <Slider
            class={styles.slider}
            label="強さ"
            min={STRENGTH_MIN}
            max={STRENGTH_MAX}
            value={layer.strength}
            valueText={`${layer.strength}`}
            onInput={(strength) => updateLayer(layer.id, { strength })}
          />
          <Slider
            class={styles.slider}
            label="柔らかさ"
            min={SOFTNESS_MIN}
            max={SOFTNESS_MAX}
            value={layer.softness}
            valueText={`${layer.softness}`}
            onInput={(softness) => updateLayer(layer.id, { softness })}
          />
        </>
      ) : (
        <>
          <span class={styles.badge} aria-hidden="true">
            {layer.char}
          </span>
          <Button onClick={() => (emojiPickerOpen.value = true)}>内容を変更</Button>
          <Slider
            class={styles.slider}
            label="大きさ"
            min={MIN_LAYER_SIZE}
            max={maxEmojiSize}
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
      )}
      <Button
        square
        variant="ghost"
        title="背面へ"
        aria-label="背面へ"
        disabled={index <= 0}
        onClick={() => moveLayer(layer.id, -1)}
      >
        <Icon name="back" />
      </Button>
      <Button
        square
        variant="ghost"
        title="前面へ"
        aria-label="前面へ"
        disabled={index < 0 || index >= layers.value.length - 1}
        onClick={() => moveLayer(layer.id, 1)}
      >
        <Icon name="front" />
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          pushHistory()
          updateLayer(layer.id, { rotation: 0 })
        }}
        disabled={layer.rotation === 0}
      >
        回転を戻す
      </Button>
      <Button variant="danger" onClick={() => removeLayer(layer.id)}>
        <Icon name="trash" />
        削除
      </Button>
    </>
  )
}
