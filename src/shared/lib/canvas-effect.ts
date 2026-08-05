import { type Box, boxCorners } from './geometry'

export type ClipShape = 'rect' | 'ellipse'

let filterSupport: boolean | null = null

/** Canvas 2D の filter が使えるか（未対応環境ではボカシをモザイクで代替する）。 */
export function supportsCanvasFilter(): boolean {
  if (filterSupport === null) {
    const ctx = document.createElement('canvas').getContext('2d')
    filterSupport = !!ctx && typeof ctx.filter === 'string'
  }
  return filterSupport
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

// 縮小画像の一時置き場。モザイク描画のたびに canvas を作らないよう使い回す。
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

/** 画像全体をぼかして (0,0)-(width,height) に描く。 */
export function drawBlurred(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.filter = `blur(${radius}px)`
  ctx.drawImage(source, 0, 0, width, height)
  ctx.filter = 'none'
}
