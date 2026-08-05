import type { Box } from '@/shared/lib'

import type { EmojiLayer } from './emoji'
import type { MaskLayer } from './mask'

export interface LayerBase extends Box {
  id: string
}

export type Layer = MaskLayer | EmojiLayer

let counter = 0

export function createLayerId(): string {
  counter += 1
  return `l${counter}`
}

/**
 * 保存しておいたレイヤを復元したときに採番を進める。
 * カウンタはリロードで 0 に戻るのに復元したレイヤは前回の ID を持ったままなので、
 * これをしないと新しいレイヤの ID が衝突し、選択が別のレイヤに解決されてしまう。
 */
export function reserveLayerIds(restored: readonly { id: string }[]): void {
  for (const layer of restored) {
    const value = Number.parseInt(layer.id.replace(/^l/, ''), 10)
    if (Number.isFinite(value)) counter = Math.max(counter, value)
  }
}

/** 領域の最小辺（画像ピクセル）。これ以下には縮められない。 */
export const MIN_LAYER_SIZE = 12
