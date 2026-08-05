import type { Box } from '@/shared/lib'

import type { EmojiLayer } from './emoji'
import type { MaskLayer } from './mask'

export interface LayerBase extends Box {
  id: string
}

export type Layer = MaskLayer | EmojiLayer

/** 画面内で一意であれば十分なので連番で作る（永続化しない）。 */
let counter = 0

export function createLayerId(): string {
  counter += 1
  return `l${counter}`
}

/** 領域の最小辺（画像ピクセル）。これ以下には縮められない。 */
export const MIN_LAYER_SIZE = 12
