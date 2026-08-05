import {
  type ImageSource,
  clipToBox,
  drawBlurred,
  drawPixelated,
  scaleBox,
  supportsCanvasFilter,
} from '@/shared/lib'

import { EMOJI_FONT_STACK } from '../config/emoji-presets'
import type { EmojiLayer } from '../model/emoji'
import type { Layer } from '../model/layer'
import { type MaskLayer, blurRadiusFor, pixelCellFor } from '../model/mask'

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

function drawMask(
  ctx: CanvasRenderingContext2D,
  image: ImageSource,
  layer: MaskLayer,
  width: number,
  height: number,
  scale: number,
): void {
  ctx.save()
  clipToBox(ctx, layer.shape, scaleBox(layer, scale))
  if (layer.effect === 'blur' && supportsCanvasFilter()) {
    const radius = blurRadiusFor(layer) * scale
    // ぼかしは画像の外側を透明として扱うため、画像の縁に近い領域では
    // 下に描かれている元画像が透ける。先に不透明なモザイクを敷いて防ぐ。
    drawPixelated(ctx, image, width, height, Math.max(radius, 4))
    drawBlurred(ctx, image, width, height, radius)
  } else {
    drawPixelated(ctx, image, width, height, pixelCellFor(layer) * scale)
  }
  ctx.restore()
}

function drawEmoji(ctx: CanvasRenderingContext2D, layer: EmojiLayer, scale: number): void {
  const box = scaleBox(layer, scale)
  ctx.save()
  ctx.translate(box.cx, box.cy)
  ctx.rotate(box.rotation)
  ctx.font = `${Math.max(box.height, 1)}px ${EMOJI_FONT_STACK}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(layer.char, 0, 0)
  ctx.restore()
}
