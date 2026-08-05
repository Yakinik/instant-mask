import { type Point, clamp } from '@/shared/lib'

/**
 * 画像ビューの表示状態。`zoom` は「画面に収まる倍率」を 1 とした相対値、
 * `x` / `y` はビューポート中心からのずれ（表示ピクセル）。
 */
export interface ViewState {
  zoom: number
  x: number
  y: number
}

export const FIT_VIEW: ViewState = { zoom: 1, x: 0, y: 0 }

export const MIN_ZOOM = 1
export const MAX_ZOOM = 8

export function isZoomed(view: ViewState): boolean {
  return view.zoom > MIN_ZOOM + 0.001
}

export interface ResolvedView {
  view: ViewState
  /** 画像ピクセル → 表示ピクセルの倍率。 */
  scale: number
  width: number
  height: number
}

/**
 * 倍率を範囲内に収め、はみ出す分だけパンを許可した状態に解決する。
 * ビューポートより小さい方向は中央に固定される。
 */
export function resolveView(
  view: ViewState,
  fitScale: number,
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): ResolvedView {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM)
  const scale = fitScale * zoom
  const width = imageWidth * scale
  const height = imageHeight * scale
  const maxX = Math.max(0, (width - viewportWidth) / 2)
  const maxY = Math.max(0, (height - viewportHeight) / 2)
  return {
    view: { zoom, x: clamp(view.x, -maxX, maxX), y: clamp(view.y, -maxY, maxY) },
    scale,
    width,
    height,
  }
}

/** anchor（ビューポート中心を原点とする座標）の位置を保ったまま拡縮する。 */
export function zoomAt(view: ViewState, factor: number, anchor: Point): ViewState {
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM)
  const ratio = zoom / view.zoom
  return {
    zoom,
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
  }
}

export function panBy(view: ViewState, dx: number, dy: number): ViewState {
  return { ...view, x: view.x + dx, y: view.y + dy }
}

export interface PinchAnchor {
  view: ViewState
  center: Point
  distance: number
}

export function pinchCenter(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function pinchDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/**
 * 2 本指の距離比で拡縮しつつ、中点の移動をそのままパンに反映する。
 * 指をついた瞬間の状態（PinchAnchor）を基準にするので、累積誤差が出ない。
 */
export function applyPinch(
  start: PinchAnchor,
  center: Point,
  distance: number,
): ViewState {
  const zoom = clamp(
    (start.view.zoom * distance) / Math.max(start.distance, 1),
    MIN_ZOOM,
    MAX_ZOOM,
  )
  const ratio = zoom / start.view.zoom
  return {
    zoom,
    x: center.x - (start.center.x - start.view.x) * ratio,
    y: center.y - (start.center.y - start.view.y) * ratio,
  }
}

/** ホイールの回転量を拡縮率に変換する（トラックパッドのピンチもこの経路）。 */
export function wheelZoomFactor(deltaY: number): number {
  return Math.exp(-clamp(deltaY, -80, 80) / 180)
}
