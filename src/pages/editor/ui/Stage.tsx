import type { JSX } from 'preact'
import { useLayoutEffect, useRef, useState } from 'preact/hooks'

import { type LoadedImage, type Point, boxFromPoints, cx } from '@/shared/lib'

import { renderScene } from '../lib/scene'
import {
  addLayer,
  layers,
  maskEffect,
  maskShape,
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
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
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

  // 画像がビューポートに収まる倍率。拡大はしない。
  const scale =
    viewport.width > 0 && viewport.height > 0
      ? Math.min(1, viewport.width / image.width, viewport.height / image.height)
      : 0
  const displayWidth = image.width * scale
  const displayHeight = image.height * scale

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || scale <= 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pixelWidth = Math.max(1, Math.round(displayWidth * dpr))
    const pixelHeight = Math.max(1, Math.round(displayHeight * dpr))
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    renderScene(ctx, image.source, image, layerList, scale * dpr)
  }, [image, layerList, scale, displayWidth, displayHeight])

  const toImagePoint = (event: PointerEvent): Point => {
    const rect = surfaceRef.current?.getBoundingClientRect()
    if (!rect || scale <= 0) return { x: 0, y: 0 }
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    }
  }

  const startDraft = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    selectLayer(null)

    const target = event.currentTarget
    const origin = toImagePoint(event)
    setDraft({ start: origin, current: origin })
    target.setPointerCapture(event.pointerId)

    const move = (pointer: PointerEvent) => {
      setDraft({ start: origin, current: toImagePoint(pointer) })
    }
    const finish = (pointer: PointerEvent) => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', finish)
      target.removeEventListener('pointercancel', finish)
      setDraft(null)
      const box = boxFromPoints(origin, toImagePoint(pointer))
      if (box.width < MIN_LAYER_SIZE || box.height < MIN_LAYER_SIZE) return
      addLayer(
        createMaskLayer(box, maskEffect.value, maskShape.value, maskStrength.value),
      )
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', finish)
    target.addEventListener('pointercancel', finish)
  }

  const draftBox = draft ? boxFromPoints(draft.start, draft.current) : null

  return (
    <div class={styles.stage} ref={containerRef}>
      <div
        class={styles.surface}
        ref={surfaceRef}
        style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
        hidden={scale <= 0}
      >
        <canvas
          ref={canvasRef}
          class={styles.canvas}
          style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
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
    </div>
  )
}
