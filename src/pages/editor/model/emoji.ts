import { EMOJI_FONT_STACK } from '../config/emoji-presets'
import { type LayerBase, createLayerId } from './layer'

export interface EmojiLayer extends LayerBase {
  kind: 'emoji'
  /** 絵文字 1 文字でも、任意のテキストでもよい。 */
  char: string
}

// 文字幅の計測用。使い回す。
let measureCtx: CanvasRenderingContext2D | null = null

/** size px で描いたときの文字列の幅。枠と見た目を一致させるために使う。 */
export function measureStampWidth(text: string, size: number): number {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  if (!measureCtx) return size
  measureCtx.font = `${size}px ${EMOJI_FONT_STACK}`
  return Math.max(size * 0.4, measureCtx.measureText(text).width)
}

/** 絵文字だけで構成されているか。テキストには縁取りを付けて読めるようにする。 */
export function isEmojiOnly(text: string): boolean {
  return /\p{Extended_Pictographic}/u.test(text) && !/[\p{L}\p{N}]/u.test(text)
}

export function createEmojiLayer(
  char: string,
  cx: number,
  cy: number,
  size: number,
): EmojiLayer {
  return {
    id: createLayerId(),
    kind: 'emoji',
    char,
    cx,
    cy,
    width: measureStampWidth(char, size),
    height: size,
    rotation: 0,
  }
}
