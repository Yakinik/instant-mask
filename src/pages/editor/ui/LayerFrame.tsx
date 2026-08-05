import type { JSX } from 'preact'

import { type Box, type Point, cx } from '@/shared/lib'

import {
  CORNER_HANDLES,
  EDGE_HANDLES,
  type ResizeHandle,
  cursorForHandle,
  moveBox,
  resizeBox,
  rotateBox,
} from '../lib/pointer-gesture'
import { pushHistory, selectLayer, updateLayer } from '../model/editor'
import { MIN_LAYER_SIZE, type Layer } from '../model/layer'
import styles from './LayerFrame.module.css'

const HANDLE_POSITION: Record<ResizeHandle, { left: string; top: string }> = {
  nw: { left: '0%', top: '0%' },
  n: { left: '50%', top: '0%' },
  ne: { left: '100%', top: '0%' },
  e: { left: '100%', top: '50%' },
  se: { left: '100%', top: '100%' },
  s: { left: '50%', top: '100%' },
  sw: { left: '0%', top: '100%' },
  w: { left: '0%', top: '50%' },
}

export interface LayerFrameProps {
  layer: Layer
  scale: number
  selected: boolean
  /** ポインタ位置を画像ピクセル座標に変換する。 */
  toImagePoint: (event: PointerEvent) => Point
}

export function LayerFrame({ layer, scale, selected, toImagePoint }: LayerFrameProps) {
  const handles = layer.kind === 'emoji' ? CORNER_HANDLES : EDGE_HANDLES

  function beginGesture(
    event: JSX.TargetedPointerEvent<HTMLElement>,
    update: (pointer: PointerEvent, delta: Point) => void,
  ): void {
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    selectLayer(layer.id)

    const target = event.currentTarget
    const originX = event.clientX
    const originY = event.clientY
    target.setPointerCapture(event.pointerId)

    // 実際に動かし始めた時点で 1 回だけ履歴を積む（クリックだけでは積まない）。
    let changed = false
    const move = (pointer: PointerEvent) => {
      if (!changed) {
        changed = true
        pushHistory()
      }
      update(pointer, {
        x: (pointer.clientX - originX) / scale,
        y: (pointer.clientY - originY) / scale,
      })
    }
    const finish = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', finish)
      target.removeEventListener('pointercancel', finish)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', finish)
    target.addEventListener('pointercancel', finish)
  }

  const startMove = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    const start: Box = layer
    beginGesture(event, (_, delta) => updateLayer(layer.id, moveBox(start, delta)))
  }

  const startResize =
    (handle: ResizeHandle) => (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
      const start: Box = layer
      const options = { keepAspect: layer.kind === 'emoji', min: MIN_LAYER_SIZE }
      beginGesture(event, (_, delta) =>
        updateLayer(layer.id, resizeBox(start, handle, delta, options)),
      )
    }

  const startRotate = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    const start: Box = layer
    const grabbedAt = toImagePoint(event)
    beginGesture(event, (pointer) =>
      updateLayer(
        layer.id,
        rotateBox(start, toImagePoint(pointer), grabbedAt, pointer.shiftKey),
      ),
    )
  }

  return (
    <div
      class={cx(styles.frame, selected && styles.selected)}
      style={{
        left: `${(layer.cx - layer.width / 2) * scale}px`,
        top: `${(layer.cy - layer.height / 2) * scale}px`,
        width: `${layer.width * scale}px`,
        height: `${layer.height * scale}px`,
        transform: `rotate(${layer.rotation}rad)`,
      }}
      onPointerDown={startMove}
    >
      {selected && (
        <>
          <div class={styles.rotate} onPointerDown={startRotate} title="ドラッグで回転" />
          {handles.map((handle) => (
            <div
              key={handle}
              class={styles.handle}
              style={{
                left: HANDLE_POSITION[handle].left,
                top: HANDLE_POSITION[handle].top,
                cursor: cursorForHandle(handle, layer.rotation),
              }}
              onPointerDown={startResize(handle)}
            />
          ))}
        </>
      )}
    </div>
  )
}
