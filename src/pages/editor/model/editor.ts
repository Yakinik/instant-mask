import { computed, signal } from '@preact/signals'

import type { LoadedImage } from '@/shared/lib'

import type { Layer } from './layer'
import {
  DEFAULT_MASK_SOFTNESS,
  DEFAULT_MASK_STRENGTH,
  type MaskEffect,
  type MaskShape,
} from './mask'

const HISTORY_LIMIT = 50

export const image = signal<LoadedImage | null>(null)
export const layers = signal<Layer[]>([])
export const selectedLayerId = signal<string | null>(null)

/** 読み込み失敗などの通知。表示したら null に戻す。 */
export const errorMessage = signal<string | null>(null)
export const emojiPickerOpen = signal(false)
/** 領域の枠とハンドルを表示するか。false の間は仕上がり確認用に操作も止める。 */
export const showFrames = signal(true)
/** ピンチ中は単指のドラッグを止め、拡縮の対象が 1 つだけになるようにする。 */
export const pinchActive = signal(false)

/** 次に作るマスクの既定設定。 */
export const maskEffect = signal<MaskEffect>('blur')
export const maskShape = signal<MaskShape>('rect')
export const maskStrength = signal(DEFAULT_MASK_STRENGTH)
export const maskSoftness = signal(DEFAULT_MASK_SOFTNESS)

const undoStack = signal<Layer[][]>([])
const redoStack = signal<Layer[][]>([])

export const selectedLayer = computed(
  () => layers.value.find((layer) => layer.id === selectedLayerId.value) ?? null,
)
export const canUndo = computed(() => undoStack.value.length > 0)
export const canRedo = computed(() => redoStack.value.length > 0)

/** 変更を始める前に呼ぶ。ドラッグ中は 1 回だけ呼び、以降は updateLayer で更新する。 */
export function pushHistory(): void {
  undoStack.value = [...undoStack.value, layers.value].slice(-HISTORY_LIMIT)
  redoStack.value = []
}

export function setImage(next: LoadedImage): void {
  const current = image.value?.source
  if (current instanceof ImageBitmap) current.close()
  image.value = next
  layers.value = []
  selectedLayerId.value = null
  undoStack.value = []
  redoStack.value = []
  errorMessage.value = null
}

export function closeImage(): void {
  const current = image.value?.source
  if (current instanceof ImageBitmap) current.close()
  image.value = null
  layers.value = []
  selectedLayerId.value = null
  undoStack.value = []
  redoStack.value = []
}

export function addLayer(layer: Layer): void {
  pushHistory()
  layers.value = [...layers.value, layer]
  selectedLayerId.value = layer.id
}

/**
 * レイヤを部分更新する。履歴は積まないので、操作の開始時に pushHistory を呼ぶこと。
 * Partial<Layer> は種類ごとに分配されるため、種類固有の項目も型安全に渡せる。
 */
export function updateLayer(id: string, patch: Partial<Layer>): void {
  layers.value = layers.value.map((layer) =>
    layer.id === id ? ({ ...layer, ...patch } as Layer) : layer,
  )
}

/** 選択レイヤが配列の何番目か。末尾ほど前面に描かれる。 */
export const selectedLayerIndex = computed(() =>
  layers.value.findIndex((layer) => layer.id === selectedLayerId.value),
)

/** 重なり順を 1 つ動かす。direction は 1 で前面、-1 で背面。 */
export function moveLayer(id: string, direction: 1 | -1): void {
  const list = layers.value
  const index = list.findIndex((layer) => layer.id === id)
  const target = index + direction
  const moved = list[index]
  if (index < 0 || !moved || target < 0 || target >= list.length) return
  pushHistory()
  const reordered = [...list]
  reordered.splice(index, 1)
  reordered.splice(target, 0, moved)
  layers.value = reordered
}

export function removeLayer(id: string): void {
  pushHistory()
  layers.value = layers.value.filter((layer) => layer.id !== id)
  if (selectedLayerId.value === id) selectedLayerId.value = null
}

export function clearLayers(): void {
  if (layers.value.length === 0) return
  pushHistory()
  layers.value = []
  selectedLayerId.value = null
}

export function selectLayer(id: string | null): void {
  selectedLayerId.value = id
}

function keepSelectionValid(next: Layer[]): void {
  if (!next.some((layer) => layer.id === selectedLayerId.value)) selectedLayerId.value = null
}

export function undo(): void {
  const stack = undoStack.value
  const previous = stack.at(-1)
  if (!previous) return
  undoStack.value = stack.slice(0, -1)
  redoStack.value = [...redoStack.value, layers.value]
  layers.value = previous
  keepSelectionValid(previous)
}

export function redo(): void {
  const stack = redoStack.value
  const next = stack.at(-1)
  if (!next) return
  redoStack.value = stack.slice(0, -1)
  undoStack.value = [...undoStack.value, layers.value]
  layers.value = next
  keepSelectionValid(next)
}
