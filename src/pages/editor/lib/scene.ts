import {
  type ImageSource,
  boxBounds,
  clampRect,
  clipToBox,
  drawBlurred,
  drawPixelated,
  drawPixelatedRegion,
  insetBox,
  scaleBox,
  supportsCanvasBlur,
} from '@/shared/lib'

import { EMOJI_FONT_STACK } from '../config/emoji-presets'
import { DEFAULT_STAMP_STYLE, type EmojiLayer, withAlpha } from '../model/emoji'
import type { Layer } from '../model/layer'
import {
  type MaskLayer,
  backdropCellFor,
  blurRadiusFor,
  featherFor,
  pixelCellFor,
} from '../model/mask'

/** 境界をぼかすときの重ね塗り段数。多いほど滑らかだが描画回数も増える。 */
const FEATHER_STEPS = 12

export interface SceneSize {
  width: number
  height: number
}

/**
 * 画像とレイヤを描画する。レイヤ座標は画像ピクセル基準で保持しているので、
 * 表示（縮小）でも書き出し（原寸）でも scale を変えて同じ関数を通す。
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  image: ImageSource,
  size: SceneSize,
  layers: readonly Layer[],
  scale: number,
): void {
  const width = size.width * scale
  const height = size.height * scale
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)
  for (const layer of layers) {
    if (layer.kind === 'mask') drawMask(ctx, image, layer, width, height, scale)
    else drawEmoji(ctx, layer, scale)
  }
}

/** 画像全体にエフェクトを掛けて描く。クリップは呼び出し側の責任。 */
function paintEffect(
  ctx: CanvasRenderingContext2D,
  image: ImageSource,
  layer: MaskLayer,
  width: number,
  height: number,
  scale: number,
): void {
  if (layer.effect === 'blur') {
    const radius = blurRadiusFor(layer) * scale
    // Canvas のぼかしは画像の外側を透明として扱うため、画像の縁に近い領域では
    // 下に描かれている元画像が透ける。先に不透明なモザイクを敷いて防ぐ。
    // セルは強さに依存させない（連動させると見た目が段階的に飛ぶ）。
    // フォールバックのぼかし（縮小・拡大）は不透明なので下敷きは要らない。
    if (supportsCanvasBlur()) {
      drawPixelated(ctx, image, width, height, backdropCellFor(layer) * scale)
    }
    drawBlurred(ctx, image, width, height, radius)
  } else {
    // モザイクは領域の外接矩形を基準に切る（画像全体で切ると粗さを変えるたびに位相がずれる）
    const area = clampRect(boxBounds(scaleBox(layer, scale)), width, height)
    drawPixelatedRegion(ctx, image, scale, area, pixelCellFor(layer) * scale)
  }
}

// 境界をぼかすときの中間バッファ。エフェクトの計算を 1 回で済ませるために使う。
let effectBuffer: HTMLCanvasElement | null = null

function renderEffectBuffer(
  image: ImageSource,
  layer: MaskLayer,
  width: number,
  height: number,
  scale: number,
): HTMLCanvasElement | null {
  effectBuffer ??= document.createElement('canvas')
  const bufferWidth = Math.max(1, Math.round(width))
  const bufferHeight = Math.max(1, Math.round(height))
  if (effectBuffer.width !== bufferWidth) effectBuffer.width = bufferWidth
  if (effectBuffer.height !== bufferHeight) effectBuffer.height = bufferHeight
  const ctx = effectBuffer.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, bufferWidth, bufferHeight)
  paintEffect(ctx, image, layer, bufferWidth, bufferHeight, scale)
  return effectBuffer
}

function drawMask(
  ctx: CanvasRenderingContext2D,
  image: ImageSource,
  layer: MaskLayer,
  width: number,
  height: number,
  scale: number,
): void {
  const box = scaleBox(layer, scale)
  const feather = featherFor(layer) * scale

  if (feather < 1) {
    ctx.save()
    clipToBox(ctx, layer.shape, box)
    paintEffect(ctx, image, layer, width, height, scale)
    ctx.restore()
    return
  }

  // エフェクトは 1 回だけ作り、少しずつ内側へ縮めたクリップで重ね塗りして境界をなじませる。
  // α を 1/(steps-i+1) にすると累積の不透明度が外周 1/steps → 中心 1 の線形になり、
  // リングごとに描くのと違って継ぎ目が出ない。
  const buffer = renderEffectBuffer(image, layer, width, height, scale)
  if (!buffer) return
  for (let step = 1; step <= FEATHER_STEPS; step++) {
    const inner = insetBox(box, (feather * (step - 1)) / (FEATHER_STEPS - 1))
    if (inner.width <= 0 || inner.height <= 0) break
    ctx.save()
    clipToBox(ctx, layer.shape, inner)
    ctx.globalAlpha = 1 / (FEATHER_STEPS - step + 1)
    ctx.drawImage(buffer, 0, 0, width, height)
    ctx.restore()
  }
}

function drawEmoji(
  ctx: CanvasRenderingContext2D,
  layer: EmojiLayer,
  scale: number,
): void {
  const box = scaleBox(layer, scale)
  const fontSize = Math.max(box.height, 1)
  const style = layer.style ?? DEFAULT_STAMP_STYLE
  ctx.save()
  ctx.translate(box.cx, box.cy)
  ctx.rotate(box.rotation)
  ctx.font = `${fontSize}px ${EMOJI_FONT_STACK}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // 透過度は globalAlpha で掛ける。カラー絵文字は fillStyle が効かないため。
  ctx.globalAlpha = Math.min(100, Math.max(0, style.opacity)) / 100
  if (style.strokeWidth > 0) {
    ctx.lineWidth = Math.max(0.5, (fontSize * style.strokeWidth) / 100)
    ctx.lineJoin = 'round'
    ctx.strokeStyle = withAlpha(style.strokeColor, style.strokeOpacity)
    ctx.strokeText(layer.char, 0, 0)
  }
  ctx.fillStyle = style.color
  ctx.fillText(layer.char, 0, 0)
  ctx.restore()
}
