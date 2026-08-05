import { type Box, type Point, rotatePoint } from '@/shared/lib'

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const EDGE_HANDLES: readonly ResizeHandle[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
]
export const CORNER_HANDLES: readonly ResizeHandle[] = ['nw', 'ne', 'se', 'sw']

/** 回転のスナップ幅（15°）。Shift 押下時に使う。 */
const ROTATION_SNAP = Math.PI / 12

const HANDLE_ANGLE: Record<ResizeHandle, number> = {
  n: 0,
  ne: 45,
  e: 90,
  se: 135,
  s: 180,
  sw: 225,
  w: 270,
  nw: 315,
}

const CURSORS = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize'] as const

/** 回転したレイヤでもハンドルの向きに合ったカーソルを返す。 */
export function cursorForHandle(handle: ResizeHandle, rotation: number): string {
  const degrees = HANDLE_ANGLE[handle] + (rotation * 180) / Math.PI
  const normalized = ((degrees % 180) + 180) % 180
  return CURSORS[Math.round(normalized / 45) % 4] ?? 'move'
}

export function moveBox(start: Box, delta: Point): Box {
  return { ...start, cx: start.cx + delta.x, cy: start.cy + delta.y }
}

export interface ResizeOptions {
  /** 縦横比を保つ（絵文字レイヤ用）。 */
  keepAspect: boolean
  /** 最小の辺の長さ。 */
  min: number
}

export function resizeBox(
  start: Box,
  handle: ResizeHandle,
  delta: Point,
  options: ResizeOptions,
): Box {
  // ドラッグ量をレイヤのローカル軸に戻してから寸法に反映する。
  const local = rotatePoint(delta, -start.rotation)
  const dirX = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0
  const dirY = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0

  let width: number
  let height: number
  if (options.keepAspect && dirX !== 0 && dirY !== 0) {
    const ratio =
      1 + ((local.x * dirX) / start.width + (local.y * dirY) / start.height) / 2
    width = Math.max(options.min, start.width * ratio)
    height = Math.max(options.min, start.height * ratio)
  } else {
    width = Math.max(options.min, start.width + local.x * dirX)
    height = Math.max(options.min, start.height + local.y * dirY)
  }

  // 掴んだ辺だけを動かすため、寸法変化の半分だけ中心をずらす。
  const shift = rotatePoint(
    { x: (dirX * (width - start.width)) / 2, y: (dirY * (height - start.height)) / 2 },
    start.rotation,
  )
  return {
    cx: start.cx + shift.x,
    cy: start.cy + shift.y,
    width,
    height,
    rotation: start.rotation,
  }
}

export function rotateBox(
  start: Box,
  pointer: Point,
  grabbedAt: Point,
  snap: boolean,
): Box {
  const from = Math.atan2(grabbedAt.y - start.cy, grabbedAt.x - start.cx)
  const to = Math.atan2(pointer.y - start.cy, pointer.x - start.cx)
  const rotation = start.rotation + (to - from)
  return { ...start, rotation: snap ? Math.round(rotation / ROTATION_SNAP) * ROTATION_SNAP : rotation }
}
