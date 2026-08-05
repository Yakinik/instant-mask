import type { SegmentedOption } from '@/shared/ui'

import type { MaskEffect, MaskShape } from '../model/mask'

export const EFFECT_OPTIONS: readonly SegmentedOption<MaskEffect>[] = [
  { value: 'blur', label: 'ボカシ' },
  { value: 'pixelate', label: 'モザイク' },
]

export const SHAPE_OPTIONS: readonly SegmentedOption<MaskShape>[] = [
  { value: 'rect', label: '四角' },
  { value: 'ellipse', label: '丸' },
]

export const STRENGTH_MIN = 5
export const STRENGTH_MAX = 100
