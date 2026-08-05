import { type Box, type Rect, boxCorners } from './geometry'

export type ClipShape = 'rect' | 'ellipse'

let blurSupport: boolean | null = null

/**
 * Canvas 2D のブラーが実際に効くかを実測する。
 * `typeof ctx.filter === 'string'` は返すのにブラーが掛からない環境があるため、
 * 小さな Canvas に実際に描いて滲みを確認する。
 */
export function supportsCanvasBlur(): boolean {
  if (blurSupport !== null) return blurSupport
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx || typeof ctx.filter !== 'string') {
    blurSupport = false
    return blurSupport
  }
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 16, 16)
  ctx.filter = 'blur(3px)'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, 8, 16)
  ctx.filter = 'none'
  // 境界のすぐ外側に白が滲んでいればブラーが効いている
  const edge = ctx.getImageData(10, 8, 1, 1).data[0] ?? 0
  blurSupport = edge > 8 && edge < 248
  return blurSupport
}

/** 回転を含むボックス形状で以降の描画をクリップする。呼び出し側で save/restore すること。 */
export function clipToBox(
  ctx: CanvasRenderingContext2D,
  shape: ClipShape,
  box: Box,
): void {
  ctx.beginPath()
  if (shape === 'ellipse') {
    ctx.ellipse(
      box.cx,
      box.cy,
      Math.max(box.width, 1) / 2,
      Math.max(box.height, 1) / 2,
      box.rotation,
      0,
      Math.PI * 2,
    )
  } else {
    const [nw, ne, se, sw] = boxCorners(box)
    ctx.moveTo(nw.x, nw.y)
    ctx.lineTo(ne.x, ne.y)
    ctx.lineTo(se.x, se.y)
    ctx.lineTo(sw.x, sw.y)
    ctx.closePath()
  }
  ctx.clip()
}

// 縮小画像の一時置き場。描画のたびに canvas を作らないよう使い回す。
let scratch: HTMLCanvasElement | null = null

function getScratch(width: number, height: number): CanvasRenderingContext2D | null {
  scratch ??= document.createElement('canvas')
  if (scratch.width !== width || scratch.height !== height) {
    scratch.width = width
    scratch.height = height
  }
  const ctx = scratch.getContext('2d')
  if (ctx) ctx.clearRect(0, 0, width, height)
  return ctx
}

/** 画像全体をモザイク化して (0,0)-(width,height) に描く。 */
export function drawPixelated(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  cell: number,
): void {
  const cols = Math.max(1, Math.round(width / Math.max(cell, 1)))
  const rows = Math.max(1, Math.round(height / Math.max(cell, 1)))
  const small = getScratch(cols, rows)
  if (!small) return
  small.imageSmoothingEnabled = true
  small.drawImage(source, 0, 0, cols, rows)

  const smoothing = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small.canvas, 0, 0, cols, rows, 0, 0, width, height)
  ctx.imageSmoothingEnabled = smoothing
}

/**
 * 指定範囲だけをモザイク化して同じ場所へ描く。
 *
 * 画像全体を分割してから切り抜くと、粗さを変えるたびにセル境界の位相が範囲に対してずれ、
 * 見た目が行ったり来たりする。範囲の左上からセルを切ることでそれを防ぐ。
 *
 * `area` は描画先の座標系、`sourceScale` はソース 1px あたりの描画先ピクセル数。
 */
export function drawPixelatedRegion(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceScale: number,
  area: Rect,
  cell: number,
): void {
  if (area.width <= 0 || area.height <= 0 || sourceScale <= 0) return
  const cols = Math.max(1, Math.round(area.width / Math.max(cell, 1)))
  const rows = Math.max(1, Math.round(area.height / Math.max(cell, 1)))
  const small = getScratch(cols, rows)
  if (!small) return
  small.imageSmoothingEnabled = true
  small.drawImage(
    source,
    area.x / sourceScale,
    area.y / sourceScale,
    area.width / sourceScale,
    area.height / sourceScale,
    0,
    0,
    cols,
    rows,
  )

  const smoothing = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small.canvas, 0, 0, cols, rows, area.x, area.y, area.width, area.height)
  ctx.imageSmoothingEnabled = smoothing
}

/**
 * ctx.filter が使えない環境向けのブラー。縮小してから補間つきで引き伸ばす。
 * モザイクと違ってブロック境界が出ないので、ぼかしとして通用する見た目になる。
 */
function drawDownsampledBlur(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  radius: number,
): void {
  const factor = Math.max(2, Math.min(96, radius * 1.5))
  const cols = Math.max(1, Math.round(width / factor))
  const rows = Math.max(1, Math.round(height / factor))
  const small = getScratch(cols, rows)
  if (!small) return
  small.imageSmoothingEnabled = true
  small.imageSmoothingQuality = 'high'
  small.drawImage(source, 0, 0, cols, rows)

  const smoothing = ctx.imageSmoothingEnabled
  const quality = ctx.imageSmoothingQuality
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(small.canvas, 0, 0, cols, rows, 0, 0, width, height)
  ctx.imageSmoothingEnabled = smoothing
  ctx.imageSmoothingQuality = quality
}

/** 画像全体をぼかして (0,0)-(width,height) に描く。 */
export function drawBlurred(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  radius: number,
): void {
  if (!supportsCanvasBlur()) {
    drawDownsampledBlur(ctx, source, width, height, radius)
    return
  }
  ctx.filter = `blur(${radius}px)`
  ctx.drawImage(source, 0, 0, width, height)
  ctx.filter = 'none'
}
