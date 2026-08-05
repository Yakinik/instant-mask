import type { Box, ClipShape } from '@/shared/lib'

import { type LayerBase, createLayerId } from './layer'

export type MaskEffect = 'blur' | 'pixelate'
export type MaskShape = ClipShape

export interface MaskLayer extends LayerBase {
  kind: 'mask'
  effect: MaskEffect
  shape: MaskShape
  /** 1〜100。領域の短辺に対する相対的な強さ。 */
  strength: number
  /** 0〜100。境界をぼかして背景に馴染ませる量。0 でくっきり。 */
  softness: number
}

export const DEFAULT_MASK_STRENGTH = 50
export const DEFAULT_MASK_SOFTNESS = 0

export function createMaskLayer(
  box: Box,
  effect: MaskEffect,
  shape: MaskShape,
  strength: number,
  softness: number,
): MaskLayer {
  return { ...box, id: createLayerId(), kind: 'mask', effect, shape, strength, softness }
}

/** 半径がこれを超えると領域内が平均色に飽和し、それ以上ぼかしても見た目が変わらない（実測値）。 */
const BLUR_SATURATION = 0.3

/**
 * ぼかし半径（画像ピクセル）。強さ 100 がちょうど飽和点になるようにし、
 * 平方根カーブで中間の効きを確保する（線形だと中盤で頭打ちに感じる）。
 */
export function blurRadiusFor(layer: MaskLayer): number {
  const base = Math.min(layer.width, layer.height)
  const ratio = Math.sqrt(Math.max(0, layer.strength) / 100)
  return Math.max(1, base * BLUR_SATURATION * ratio)
}

/**
 * ぼかしの下敷きに敷くモザイクのセル。
 * 強さに連動させると、半径が少し変わるだけでセル数が整数で跳び、
 * ぼかしの見え方が段階的に変化してしまうので、強さからは独立させる。
 */
export function backdropCellFor(layer: MaskLayer): number {
  return Math.max(4, Math.min(layer.width, layer.height) / 12)
}

/** 強さの両端で領域に入るセル数。細かい側と粗い側を指数で結ぶ。 */
const PIXEL_CELLS_MIN = 2
const PIXEL_CELLS_MAX = 32

/**
 * モザイクの 1 セルの大きさ（画像ピクセル）。指数カーブで、細かい側でも粗い側でも
 * 1 目盛りあたりの見た目の変化量が揃うようにする。
 *
 * セル数は整数に丸めない。丸めると粗い側（2〜4 セル）で刻みが足りず、
 * 強さを変えても同じ見た目になる区間ができてしまう。実際の分割数は
 * 画像全体に対して計算されるので、丸めなくても十分細かく変化する。
 */
export function pixelCellFor(layer: MaskLayer): number {
  const base = Math.min(layer.width, layer.height)
  const ratio = Math.min(100, Math.max(0, layer.strength)) / 100
  const cells = PIXEL_CELLS_MAX * (PIXEL_CELLS_MIN / PIXEL_CELLS_MAX) ** ratio
  return base / cells
}

/** 境界をぼかす幅（画像ピクセル）。柔らかさ 100 で短辺の 1/4 まで。 */
export function featherFor(layer: MaskLayer): number {
  if (layer.softness <= 0) return 0
  const base = Math.min(layer.width, layer.height)
  return Math.max(1, (base * layer.softness) / 400)
}
