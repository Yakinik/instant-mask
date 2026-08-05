import { type LoadedImage, canvasToBlob, downloadBlob } from '@/shared/lib'

import type { Layer } from '../model/layer'
import { renderScene } from './scene'

const JPEG_QUALITY = 0.92

export type ExportResult = 'shared' | 'downloaded'

function buildFilename(original: string, extension: string): string {
  const base = original.replace(/\.[^.]+$/, '').trim() || 'image'
  return `${base}-masked.${extension}`
}

/**
 * 共有シート経由で保存すべき端末か。
 * モバイルでは共有シートから写真（カメラロール）に保存できるので使う。
 * デスクトップは Web Share が使える環境でも、そのままダウンロードした方が早い。
 */
export function prefersShareSheet(): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } })
    .userAgentData
  if (uaData?.mobile) return true
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return true
  // iPadOS はデスクトップ相当の UA を名乗るので、タッチ点数で見分ける
  return navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)
}

/**
 * 原寸で描き直して保存する。Canvas を経由するので EXIF などのメタデータは残らない。
 *
 * 共有シートが使える環境（iOS / Android）ではそちらを開く。ユーザーが「画像を保存」を
 * 選べばカメラロールに入る。使えない環境や共有に失敗したときはダウンロードにフォールバックする。
 */
export async function exportImage(
  image: LoadedImage,
  layers: readonly Layer[],
): Promise<ExportResult> {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('画像を書き出せませんでした')

  // 原寸なので変換は掛けない。座標はそのまま画像ピクセル。
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, image.width, image.height)
  renderScene(ctx, image.source, image, layers)

  const asJpeg = image.type === 'image/jpeg'
  const blob = asJpeg
    ? await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
    : await canvasToBlob(canvas, 'image/png')
  const filename = buildFilename(image.name, asJpeg ? 'jpg' : 'png')

  const file = new File([blob], filename, { type: blob.type })
  if (
    prefersShareSheet() &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (error) {
      // 共有シートを閉じただけならエラー扱いにしない
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared'
    }
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}
