export type ImageSource = ImageBitmap | HTMLImageElement

export interface LoadedImage {
  source: ImageSource
  /** 元データ。編集状態の保存・復元に使う。 */
  blob: Blob
  width: number
  height: number
  /** 元ファイル名（クリップボード経由など不明な場合は空文字）。 */
  name: string
  /** 元の MIME タイプ。書き出し形式の既定値に使う。 */
  type: string
}

function decodeWithImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像を読み込めませんでした'))
    }
    image.src = url
  })
}

export async function decodeImageFile(file: File): Promise<LoadedImage> {
  let source: ImageSource
  try {
    // EXIF の向きを反映させる。未対応環境では img 要素にフォールバックする。
    source = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    source = await decodeWithImageElement(file)
  }
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height
  if (!width || !height) throw new Error('画像を読み込めませんでした')
  return { source, blob: file, width, height, name: file.name, type: file.type }
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function findImageFile(files: FileList | File[] | null | undefined): File | null {
  if (!files) return null
  for (const file of Array.from(files)) {
    if (isImageFile(file)) return file
  }
  return null
}

export function findImageInClipboard(items: DataTransferItemList | null): File | null {
  if (!items) return null
  for (const item of Array.from(items)) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (file && isImageFile(file)) return file
  }
  return null
}
