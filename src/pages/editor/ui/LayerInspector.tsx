import { Button, Icon, SegmentedControl, Slider } from '@/shared/ui'

import {
  EFFECT_OPTIONS,
  SHAPE_OPTIONS,
  STRENGTH_MAX,
  STRENGTH_MIN,
} from '../config/mask-options'
import {
  emojiPickerOpen,
  image,
  pushHistory,
  removeLayer,
  updateLayer,
} from '../model/editor'
import { MIN_LAYER_SIZE, type Layer } from '../model/layer'
import styles from './LayerInspector.module.css'

export function LayerInspector({ layer }: { layer: Layer }) {
  const current = image.value
  const maxEmojiSize = current
    ? Math.round(Math.min(current.width, current.height) * 1.5)
    : 600

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
            label="強さ"
            min={STRENGTH_MIN}
            max={STRENGTH_MAX}
            value={layer.strength}
            valueText={`${layer.strength}`}
            onInput={(strength) => updateLayer(layer.id, { strength })}
          />
        </>
      ) : (
        <>
          <span class={styles.badge} aria-hidden="true">
            {layer.char}
          </span>
          <Button onClick={() => (emojiPickerOpen.value = true)}>絵文字を変更</Button>
          <Slider
            label="大きさ"
            min={MIN_LAYER_SIZE}
            max={maxEmojiSize}
            value={Math.round(layer.width)}
            valueText={`${Math.round(layer.width)}px`}
            onInput={(size) => updateLayer(layer.id, { width: size, height: size })}
          />
        </>
      )}
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
