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
  canRedo,
  canUndo,
  clearLayers,
  emojiPickerOpen,
  layers,
  maskEffect,
  maskShape,
  maskSoftness,
  maskStrength,
  redo,
  selectedLayer,
  showFrames,
  undo,
} from '../model/editor'
import { LayerInspector } from './LayerInspector'
import styles from './Toolbar.module.css'

function MaskDefaults() {
  return (
    <>
      <SegmentedControl
        label="効果"
        options={EFFECT_OPTIONS}
        value={maskEffect.value}
        onChange={(effect) => {
          maskEffect.value = effect
        }}
      />
      <SegmentedControl
        label="形"
        options={SHAPE_OPTIONS}
        value={maskShape.value}
        onChange={(shape) => {
          maskShape.value = shape
        }}
      />
      <Slider
        class={styles.slider}
        label="強さ"
        min={STRENGTH_MIN}
        max={STRENGTH_MAX}
        value={maskStrength.value}
        valueText={`${maskStrength.value}`}
        onInput={(strength) => {
          maskStrength.value = strength
        }}
      />
      <Slider
        class={styles.slider}
        label="柔らかさ"
        min={SOFTNESS_MIN}
        max={SOFTNESS_MAX}
        value={maskSoftness.value}
        valueText={`${maskSoftness.value}`}
        onInput={(softness) => {
          maskSoftness.value = softness
        }}
      />
      <span class={styles.hint}>ドラッグで範囲指定・ホイールで拡縮</span>
    </>
  )
}

export function Toolbar() {
  const selected = selectedLayer.value

  return (
    <div class={styles.bar}>
      <div class={styles.settings}>
        {selected ? <LayerInspector layer={selected} /> : <MaskDefaults />}
      </div>
      <div class={styles.actions}>
        {/* 領域を選択中でも追加できるよう、常に出しておく */}
        <Button onClick={() => (emojiPickerOpen.value = true)}>
          <Icon name="plus" />
          絵文字・文字
        </Button>
        <Button
          square
          variant={showFrames.value ? 'default' : 'ghost'}
          title={showFrames.value ? '枠を隠して仕上がりを見る' : '枠を表示して編集に戻る'}
          aria-label={showFrames.value ? '枠を隠す' : '枠を表示'}
          aria-pressed={showFrames.value}
          onClick={() => {
            showFrames.value = !showFrames.value
          }}
        >
          <Icon name="frame" />
        </Button>
        <Button
          square
          variant="ghost"
          title="元に戻す"
          aria-label="元に戻す"
          disabled={!canUndo.value}
          onClick={undo}
        >
          <Icon name="undo" />
        </Button>
        <Button
          square
          variant="ghost"
          title="やり直す"
          aria-label="やり直す"
          disabled={!canRedo.value}
          onClick={redo}
        >
          <Icon name="redo" />
        </Button>
        <Button
          variant="ghost"
          onClick={clearLayers}
          disabled={layers.value.length === 0}
        >
          全消去
        </Button>
      </div>
    </div>
  )
}
