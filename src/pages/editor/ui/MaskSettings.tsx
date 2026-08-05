import { SegmentedControl, Slider } from '@/shared/ui'

import {
  EFFECT_OPTIONS,
  SHAPE_OPTIONS,
  SOFTNESS_MAX,
  SOFTNESS_MIN,
  STRENGTH_MAX,
  STRENGTH_MIN,
} from '../config/mask-options'
import {
  maskEffect,
  maskShape,
  maskSoftness,
  maskStrength,
  pushHistory,
  updateLayer,
} from '../model/editor'
import type { MaskEffect, MaskLayer, MaskShape } from '../model/mask'
import styles from './Toolbar.module.css'

export interface MaskSettingsProps {
  /** 選択中のマスク。null なら「次に作るマスク」の既定値を編集する。 */
  layer: MaskLayer | null
}

/**
 * 未選択のときと選択中のときで同じ並びにするため、両方をこのコンポーネントで扱う。
 * 別々に書くと項目の順序や有無がずれて、選択を切り替えるたびにボタンが動いてしまう。
 */
export function MaskSettings({ layer }: MaskSettingsProps) {
  const setEffect = (effect: MaskEffect) => {
    if (!layer) {
      maskEffect.value = effect
      return
    }
    pushHistory()
    updateLayer(layer.id, { effect })
  }
  const setShape = (shape: MaskShape) => {
    if (!layer) {
      maskShape.value = shape
      return
    }
    pushHistory()
    updateLayer(layer.id, { shape })
  }
  // 連続的に変わる値なので履歴には積まない
  const setStrength = (strength: number) => {
    if (layer) updateLayer(layer.id, { strength })
    else maskStrength.value = strength
  }
  const setSoftness = (softness: number) => {
    if (layer) updateLayer(layer.id, { softness })
    else maskSoftness.value = softness
  }

  const effect = layer?.effect ?? maskEffect.value
  const shape = layer?.shape ?? maskShape.value
  const strength = layer?.strength ?? maskStrength.value
  const softness = layer?.softness ?? maskSoftness.value

  return (
    <>
      <SegmentedControl
        label="効果"
        options={EFFECT_OPTIONS}
        value={effect}
        onChange={setEffect}
      />
      <SegmentedControl
        label="形"
        options={SHAPE_OPTIONS}
        value={shape}
        onChange={setShape}
      />
      <Slider
        class={styles.slider}
        label="強さ"
        min={STRENGTH_MIN}
        max={STRENGTH_MAX}
        value={strength}
        valueText={`${strength}`}
        onInput={setStrength}
      />
      <Slider
        class={styles.slider}
        label="柔らかさ"
        min={SOFTNESS_MIN}
        max={SOFTNESS_MAX}
        value={softness}
        valueText={`${softness}`}
        onInput={setSoftness}
      />
    </>
  )
}
