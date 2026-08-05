import type { JSX } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'

import { type LoadedImage, type Point, boxFromPoints, cx } from '@/shared/lib'

import { renderScene } from '../lib/scene'
import {
  FIT_VIEW,
  type PinchAnchor,
  type ViewState,
  applyPinch,
  isZoomed,
  panBy,
  pinchCenter,
  pinchDistance,
  resolveView,
  wheelZoomFactor,
  zoomAt,
} from '../lib/viewport-gesture'
import {
  addLayer,
  layers,
  maskEffect,
  maskShape,
  maskSoftness,
  maskStrength,
  selectLayer,
  selectedLayerId,
} from '../model/editor'
import { MIN_LAYER_SIZE } from '../model/layer'
import { createMaskLayer } from '../model/mask'
import { LayerFrame } from './LayerFrame'
import styles from './Stage.module.css'

interface DraftRegion {
  start: Point
  current: Point
}

export function Stage({ image }: { image: LoadedImage }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointersRef = useRef(new Map<number, Point>())
  const pinchRef = useRef<PinchAnchor | null>(null)
  // 指を離す順序の都合で pinchRef は最後の 1 本が残った時点で消える。
  // 「このタッチ列でピンチが起きたか」は別に覚えておき、全部離れるまで領域確定を抑える。
  const pinchedRef = useRef(false)

  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [view, setView] = useState<ViewState>(FIT_VIEW)
  const [draft, setDraft] = useState<DraftRegion | null>(null)

  const layerList = layers.value
  const selectedId = selectedLayerId.value

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setViewport({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // 画像を差し替えたら全体表示に戻す
  useEffect(() => setView(FIT_VIEW), [image])

  // 画像がビューポートに収まる倍率。これを 1 として拡大していく。
  const fitScale =
    viewport.width > 0 && viewport.height > 0
      ? Math.min(1, viewport.width / image.width, viewport.height / image.height)
      : 0
  const resolved = resolveView(
    view,
    fitScale,
    image.width,
    image.height,
    viewport.width,
    viewport.height,
  )
  const activeView = resolved.view
  const scale = resolved.scale

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || scale <= 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    // 拡大しても元画像以上の情報はないので、原寸 × DPR を解像度の上限にする。
    const renderScale = Math.min(scale * dpr, dpr)
    const pixelWidth = Math.max(1, Math.round(image.width * renderScale))
    const pixelHeight = Math.max(1, Math.round(image.height * renderScale))
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    renderScene(ctx, image.source, image, layerList, renderScale)
  }, [image, layerList, scale])

  const toImagePoint = (event: PointerEvent): Point => {
    const rect = surfaceRef.current?.getBoundingClientRect()
    if (!rect || scale <= 0) return { x: 0, y: 0 }
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    }
  }

  /** ビューポート中心を原点とする座標へ（拡縮の軸に使う）。 */
  const toAnchor = (clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: clientX - (rect.left + rect.width / 2),
      y: clientY - (rect.top + rect.height / 2),
    }
  }

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      // トラックパッドのピンチは ctrlKey 付きのホイールとして届く
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        setView(
          zoomAt(
            activeView,
            wheelZoomFactor(event.deltaY),
            toAnchor(event.clientX, event.clientY),
          ),
        )
        return
      }
      if (resolved.width <= viewport.width && resolved.height <= viewport.height) return
      event.preventDefault()
      setView(panBy(activeView, -event.deltaX, -event.deltaY))
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [activeView, resolved.width, resolved.height, viewport.width, viewport.height])

  const trackPointerDown = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return
    const pointers = pointersRef.current
    // 指が 1 本もない状態からの開始 = 新しいジェスチャ
    if (pointers.size === 0) pinchedRef.current = false
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size !== 2) return
    const [first, second] = [...pointers.values()]
    if (!first || !second) return
    // 2 本目が触れた時点で範囲ドラッグは取り消し、ピンチに切り替える
    pinchedRef.current = true
    setDraft(null)
    const center = pinchCenter(first, second)
    pinchRef.current = {
      view: activeView,
      center: toAnchor(center.x, center.y),
      distance: pinchDistance(first, second),
    }
  }

  const trackPointerMove = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const anchor = pinchRef.current
    if (!anchor || pointers.size < 2) return
    const [first, second] = [...pointers.values()]
    if (!first || !second) return
    const center = pinchCenter(first, second)
    setView(
      applyPinch(anchor, toAnchor(center.x, center.y), pinchDistance(first, second)),
    )
  }

  const trackPointerUp = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
  }

  const startDraft = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if (pointersRef.current.size >= 2) return
    // 触れている指が無い = マウスなどの単独ジェスチャ。前のピンチの痕跡は消しておく
    // （マウスの pointerdown はタッチ用の追跡を通らないため、ここで面倒を見る）
    if (pointersRef.current.size === 0) pinchedRef.current = false
    event.preventDefault()
    selectLayer(null)

    const target = event.currentTarget
    const origin = toImagePoint(event)
    setDraft({ start: origin, current: origin })
    try {
      target.setPointerCapture(event.pointerId)
    } catch {
      // キャプチャできない環境でも、要素内のドラッグは追えるので続行する
    }

    const move = (pointer: PointerEvent) => {
      if (pinchedRef.current) return
      setDraft({ start: origin, current: toImagePoint(pointer) })
    }
    const finish = (pointer: PointerEvent) => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', finish)
      target.removeEventListener('pointercancel', finish)
      setDraft(null)
      if (pinchedRef.current) return
      const box = boxFromPoints(origin, toImagePoint(pointer))
      if (box.width < MIN_LAYER_SIZE || box.height < MIN_LAYER_SIZE) return
      addLayer(
        createMaskLayer(
          box,
          maskEffect.value,
          maskShape.value,
          maskStrength.value,
          maskSoftness.value,
        ),
      )
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', finish)
    target.addEventListener('pointercancel', finish)
  }

  const draftBox = draft ? boxFromPoints(draft.start, draft.current) : null
  const zoomed = isZoomed(activeView)

  return (
    <div
      class={styles.stage}
      ref={containerRef}
      onPointerDownCapture={trackPointerDown}
      onPointerMoveCapture={trackPointerMove}
      onPointerUpCapture={trackPointerUp}
      onPointerCancelCapture={trackPointerUp}
      onDblClick={() => setView(FIT_VIEW)}
    >
      <div
        class={styles.surface}
        ref={surfaceRef}
        style={{
          width: `${resolved.width}px`,
          height: `${resolved.height}px`,
          transform: `translate(${activeView.x}px, ${activeView.y}px)`,
        }}
        hidden={scale <= 0}
      >
        <canvas
          ref={canvasRef}
          class={styles.canvas}
          style={{ width: `${resolved.width}px`, height: `${resolved.height}px` }}
        />
        <div class={styles.overlay} onPointerDown={startDraft}>
          {layerList.map((layer) => (
            <LayerFrame
              key={layer.id}
              layer={layer}
              scale={scale}
              selected={layer.id === selectedId}
              toImagePoint={toImagePoint}
            />
          ))}
          {draftBox && (
            <div
              class={cx(styles.draft, maskShape.value === 'ellipse' && styles.ellipse)}
              style={{
                left: `${(draftBox.cx - draftBox.width / 2) * scale}px`,
                top: `${(draftBox.cy - draftBox.height / 2) * scale}px`,
                width: `${draftBox.width * scale}px`,
                height: `${draftBox.height * scale}px`,
              }}
            />
          )}
        </div>
      </div>

      {zoomed && (
        <button type="button" class={styles.zoomReset} onClick={() => setView(FIT_VIEW)}>
          {Math.round(activeView.zoom * 100)}% · 全体表示
        </button>
      )}
    </div>
  )
}
