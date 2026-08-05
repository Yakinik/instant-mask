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

// ぼかし用の作業バッファ。getImageData を多用するのでモザイク用とは分ける。
let blurScratch: HTMLCanvasElement | null = null

function getBlurScratch(
  width: number,
  height: number,
): CanvasRenderingContext2D | null {
  blurScratch ??= document.createElement('canvas')
  if (blurScratch.width !== width || blurScratch.height !== height) {
    blurScratch.width = width
    blurScratch.height = height
  }
  return blurScratch.getContext('2d', { willReadFrequently: true })
}

/** 移動平均を 1 パス。horizontal で走査方向を切り替える。 */
function boxBlurPass(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
): void {
  const lines = horizontal ? height : width
  const span = horizontal ? width : height
  const step = horizontal ? 4 : width * 4
  const lineStep = horizontal ? width * 4 : 4
  const window = radius * 2 + 1
  const at = (index: number) => Math.min(Math.max(index, 0), span - 1)

  for (let line = 0; line < lines; line++) {
    const base = line * lineStep
    let r = 0
    let g = 0
    let b = 0
    let a = 0
    for (let i = -radius; i <= radius; i++) {
      const index = base + at(i) * step
      r += src[index] ?? 0
      g += src[index + 1] ?? 0
      b += src[index + 2] ?? 0
      a += src[index + 3] ?? 0
    }
    for (let i = 0; i < span; i++) {
      const out = base + i * step
      dst[out] = r / window
      dst[out + 1] = g / window
      dst[out + 2] = b / window
      dst[out + 3] = a / window
      const drop = base + at(i - radius) * step
      const add = base + at(i + radius + 1) * step
      r += (src[add] ?? 0) - (src[drop] ?? 0)
      g += (src[add + 1] ?? 0) - (src[drop + 1] ?? 0)
      b += (src[add + 2] ?? 0) - (src[drop + 2] ?? 0)
      a += (src[add + 3] ?? 0) - (src[drop + 3] ?? 0)
    }
  }
}

/**
 * 移動平均を 3 回重ねてガウシアンに近づける。
 * 半径は整数しか取れないが、パスごとに 1 だけ大きくすることで実効半径の刻みを 1/3 にし、
 * 強さを動かしたときの段差を目立たなくする。
 */
function boxBlur(image: ImageData, radius: number): void {
  const base = Math.max(1, Math.floor(radius))
  const fraction = Math.max(0, Math.min(1, radius - base))
  const radii = [
    base,
    base + (fraction > 1 / 3 ? 1 : 0),
    base + (fraction > 2 / 3 ? 1 : 0),
  ]
  const temp = new Uint8ClampedArray(image.data.length)
  for (const r of radii) {
    boxBlurPass(image.data, temp, image.width, image.height, r, true)
    boxBlurPass(temp, image.data, image.width, image.height, r, false)
  }
}

/**
 * 縮小率。半径に連動させてはいけない。連動させると
 * (1) 半径が少し動くだけで縮小後のサイズが整数で跳ね、強さの変化が段階的になる
 * (2) 表示倍率を変えたときにも跳ねて、ズームするたびにぼかしの粗さが変わる
 * 固定にすれば、縮小後のサイズも半径も表示倍率に比例するので、見た目が倍率に依らない。
 */
const BLUR_DOWNSCALE = 0.3

/**
 * ctx.filter が使えない環境（WebKit / iOS Safari）向けのブラー。
 * 縮小してから移動平均を掛け、補間つきで引き伸ばす。
 */
function drawDownsampledBlur(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  radius: number,
): void {
  const bufferWidth = Math.max(1, Math.round(width * BLUR_DOWNSCALE))
  const bufferHeight = Math.max(1, Math.round(height * BLUR_DOWNSCALE))
  const small = getBlurScratch(bufferWidth, bufferHeight)
  if (!small) return
  small.imageSmoothingEnabled = true
  small.imageSmoothingQuality = 'high'
  small.clearRect(0, 0, bufferWidth, bufferHeight)
  small.drawImage(source, 0, 0, bufferWidth, bufferHeight)

  const buffer = small.getImageData(0, 0, bufferWidth, bufferHeight)
  boxBlur(buffer, radius * BLUR_DOWNSCALE)
  small.putImageData(buffer, 0, 0)

  const smoothing = ctx.imageSmoothingEnabled
  const quality = ctx.imageSmoothingQuality
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    small.canvas,
    0,
    0,
    bufferWidth,
    bufferHeight,
    0,
    0,
    width,
    height,
  )
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
