import { EMOJI_FONT_STACK } from '../config/emoji-presets'
import { type LayerBase, createLayerId } from './layer'

/** 文字の見た目。絵文字にも透過度とアウトラインは効く（文字色はカラー絵文字には効かない）。 */
export interface StampStyle {
  /** #rrggbb */
  color: string
  /** 0〜100 */
  opacity: number
  /** #rrggbb */
  strokeColor: string
  /** フォントサイズに対する % 。0 でアウトラインなし。 */
  strokeWidth: number
  /** 0〜100 */
  strokeOpacity: number
}

export const DEFAULT_STAMP_STYLE: StampStyle = {
  color: '#ffffff',
  opacity: 100,
  strokeColor: '#000000',
  strokeWidth: 14,
  strokeOpacity: 80,
}

export interface EmojiLayer extends LayerBase {
  kind: 'emoji'
  /** 絵文字 1 文字でも、任意のテキストでもよい。 */
  char: string
  style: StampStyle
}

/** #rrggbb と 0〜100 の不透明度から CSS の色を作る。 */
export function withAlpha(color: string, percent: number): string {
  const alpha = Math.round(Math.min(100, Math.max(0, percent)) * 2.55)
  return `${color}${alpha.toString(16).padStart(2, '0')}`
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

/** 絵文字だけで構成されているか。 */
export function isEmojiOnly(text: string): boolean {
  return /\p{Extended_Pictographic}/u.test(text) && !/[\p{L}\p{N}]/u.test(text)
}

export function createEmojiLayer(
  char: string,
  cx: number,
  cy: number,
  size: number,
  style: StampStyle = DEFAULT_STAMP_STYLE,
): EmojiLayer {
  return {
    id: createLayerId(),
    kind: 'emoji',
    char,
    style: { ...style },
    cx,
    cy,
    width: measureStampWidth(char, size),
    height: size,
    rotation: 0,
  }
}
