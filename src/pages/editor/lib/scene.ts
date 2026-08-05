import {
  type ImageSource,
  boxBounds,
  clampRect,
  clipToBox,
  drawBlurred,
  drawPixelated,
  drawPixelatedRegion,
  insetBox,
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

interface SceneSource {
  source: CanvasImageSource
  /** ソース 1px あたりの画像ピクセル数。 */
  scale: number
}

/** いまの変換で、画像 1px が実際に何ピクセルとして描かれるか。 */
function deviceScaleOf(ctx: CanvasRenderingContext2D): number {
  return Math.max(0.01, ctx.getTransform().a)
}

// 元画像は大きいことが多く、そこから毎フレーム縮小すると描画コストの大半を占める。
// 描画解像度ごとに一度だけ縮小して使い回す。
let scaledSource: {
  source: ImageSource
  width: number
  height: number
  canvas: HTMLCanvasElement
} | null = null

function getSceneSource(
  ctx: CanvasRenderingContext2D,
  image: ImageSource,
  size: SceneSize,
): SceneSource {
  const naturalWidth =
    image instanceof HTMLImageElement ? image.naturalWidth : image.width
  const scale = deviceScaleOf(ctx)
  const targetWidth = Math.max(1, Math.round(size.width * scale))
  const targetHeight = Math.max(1, Math.round(size.height * scale))
  // 原寸以上で描くとき（書き出しや拡大表示）は縮小しても意味がない
  if (targetWidth >= naturalWidth) return { source: image, scale: size.width / naturalWidth }
  if (
    scaledSource?.source !== image ||
    scaledSource.width !== targetWidth ||
    scaledSource.height !== targetHeight
  ) {
    const canvas = scaledSource?.canvas ?? document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d')
    if (!context) return { source: image, scale: size.width / naturalWidth }
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, targetWidth, targetHeight)
    scaledSource = { source: image, width: targetWidth, height: targetHeight, canvas }
  }
  return { source: scaledSource.canvas, scale: size.width / targetWidth }
}

/**
 * 画像とレイヤを描画する。座標はすべて画像ピクセル基準で、
 * 表示倍率や DPR は呼び出し側が transform で与える。
 * クリアも呼び出し側の責任。
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  image: ImageSource,
  size: SceneSize,
  layers: readonly Layer[],
): void {
  const scene = getSceneSource(ctx, image, size)
  ctx.drawImage(scene.source, 0, 0, size.width, size.height)
  for (const layer of layers) {
    if (layer.kind === 'mask') drawMask(ctx, scene, layer, size)
    else drawEmoji(ctx, layer)
  }
}

/** 画像全体にエフェクトを掛けて描く。クリップは呼び出し側の責任。 */
function paintEffect(
  ctx: CanvasRenderingContext2D,
  scene: SceneSource,
  layer: MaskLayer,
  size: SceneSize,
): void {
  if (layer.effect === 'blur') {
    // Canvas のぼかしは画像の外側を透明として扱うため、画像の縁に近い領域では
    // 下に描かれている元画像が透ける。先に不透明なモザイクを敷いて防ぐ。
    // セルは強さに依存させない（連動させると見た目が段階的に飛ぶ）。
    // フォールバックのぼかし（縮小 + 移動平均）は不透明なので下敷きは要らない。
    if (supportsCanvasBlur()) {
      drawPixelated(ctx, scene.source, size.width, size.height, backdropCellFor(layer))
    }
    drawBlurred(ctx, scene.source, size.width, size.height, blurRadiusFor(layer))
  } else {
    // モザイクは領域の外接矩形を基準に切る（画像全体で切ると粗さを変えるたびに位相がずれる）
    const area = clampRect(boxBounds(layer), size.width, size.height)
    drawPixelatedRegion(ctx, scene.source, scene.scale, area, pixelCellFor(layer))
  }
}

// 境界をぼかすときの中間バッファ。エフェクトの計算を 1 回で済ませるために使う。
let effectBuffer: HTMLCanvasElement | null = null

function renderEffectBuffer(
  ctx: CanvasRenderingContext2D,
  scene: SceneSource,
  layer: MaskLayer,
  size: SceneSize,
): { canvas: HTMLCanvasElement; width: number; height: number } | null {
  // バッファも実際の描画解像度で確保する（画像座標だと拡大時にここだけ粗くなる）
  const scale = deviceScaleOf(ctx)
  const width = Math.max(1, Math.round(size.width * scale))
  const height = Math.max(1, Math.round(size.height * scale))
  effectBuffer ??= document.createElement('canvas')
  if (effectBuffer.width !== width) effectBuffer.width = width
  if (effectBuffer.height !== height) effectBuffer.height = height
  const bufferCtx = effectBuffer.getContext('2d')
  if (!bufferCtx) return null
  bufferCtx.setTransform(scale, 0, 0, scale, 0, 0)
  bufferCtx.clearRect(0, 0, size.width, size.height)
  paintEffect(bufferCtx, scene, layer, size)
  return { canvas: effectBuffer, width, height }
}

function drawMask(
  ctx: CanvasRenderingContext2D,
  scene: SceneSource,
  layer: MaskLayer,
  size: SceneSize,
): void {
  const feather = featherFor(layer)

  if (feather < 1) {
    ctx.save()
    clipToBox(ctx, layer.shape, layer)
    paintEffect(ctx, scene, layer, size)
    ctx.restore()
    return
  }

  // エフェクトは 1 回だけ作り、少しずつ内側へ縮めたクリップで重ね塗りして境界をなじませる。
  // α を 1/(steps-i+1) にすると累積の不透明度が外周 1/steps → 中心 1 の線形になり、
  // リングごとに描くのと違って継ぎ目が出ない。
  const buffer = renderEffectBuffer(ctx, scene, layer, size)
  if (!buffer) return
  for (let step = 1; step <= FEATHER_STEPS; step++) {
    const inner = insetBox(layer, (feather * (step - 1)) / (FEATHER_STEPS - 1))
    if (inner.width <= 0 || inner.height <= 0) break
    ctx.save()
    clipToBox(ctx, layer.shape, inner)
    ctx.globalAlpha = 1 / (FEATHER_STEPS - step + 1)
    ctx.drawImage(
      buffer.canvas,
      0,
      0,
      buffer.width,
      buffer.height,
      0,
      0,
      size.width,
      size.height,
    )
    ctx.restore()
  }
}

function drawEmoji(ctx: CanvasRenderingContext2D, layer: EmojiLayer): void {
  const fontSize = Math.max(layer.height, 1)
  const style = layer.style ?? DEFAULT_STAMP_STYLE
  ctx.save()
  ctx.translate(layer.cx, layer.cy)
  ctx.rotate(layer.rotation)
  // 変換が掛かった状態で文字を描くので、拡大しても輪郭は解像度なりに鮮明になる
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
