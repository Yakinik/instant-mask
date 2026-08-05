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

/**
 * ぼかし半径（画像ピクセル）。領域が小さいほど半径も小さくして、
 * 小さな領域でも強度スライダーの効きが変わらないようにする。
 */
export function blurRadiusFor(layer: MaskLayer): number {
  const base = Math.min(layer.width, layer.height)
  // 既定の強さ 50 で短辺の 1/3。文字がはっきり読めなくなる程度を目安にしている。
  return Math.max(2, (base * layer.strength) / 150)
}

/** モザイクの 1 セルの大きさ（画像ピクセル）。 */
export function pixelCellFor(layer: MaskLayer): number {
  const base = Math.min(layer.width, layer.height)
  return Math.max(3, (base * layer.strength) / 200)
}

/** 境界をぼかす幅（画像ピクセル）。柔らかさ 100 で短辺の 1/4 まで。 */
export function featherFor(layer: MaskLayer): number {
  if (layer.softness <= 0) return 0
  const base = Math.min(layer.width, layer.height)
  return Math.max(1, (base * layer.softness) / 400)
}
