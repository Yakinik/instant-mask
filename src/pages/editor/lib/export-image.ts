import { type LoadedImage, canvasToBlob, downloadBlob } from '@/shared/lib'

import type { Layer } from '../model/layer'
import { renderScene } from './scene'

const JPEG_QUALITY = 0.92

function buildFilename(original: string, extension: string): string {
  const base = original.replace(/\.[^.]+$/, '').trim() || 'image'
  return `${base}-masked.${extension}`
}

/** 原寸で描き直して保存する。Canvas を経由するので EXIF などのメタデータは残らない。 */
export async function exportImage(
  image: LoadedImage,
  layers: readonly Layer[],
): Promise<void> {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('画像を書き出せませんでした')

  renderScene(ctx, image.source, image, layers, 1)

  const asJpeg = image.type === 'image/jpeg'
  const blob = asJpeg
    ? await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
    : await canvasToBlob(canvas, 'image/png')
  downloadBlob(blob, buildFilename(image.name, asJpeg ? 'jpg' : 'png'))
}
