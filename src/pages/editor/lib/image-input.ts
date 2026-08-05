import { decodeImageFile, findImageFile, findImageInClipboard } from '@/shared/lib'

import { errorMessage, setImage } from '../model/editor'

/** ファイル選択ダイアログを開く。キャンセル時は null。 */
export function openImageDialog(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true })
    input.addEventListener('cancel', () => resolve(null), { once: true })
    input.click()
  })
}

export async function acceptImageFile(file: File | null | undefined): Promise<void> {
  if (!file) return
  try {
    setImage(await decodeImageFile(file))
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '画像を読み込めませんでした'
  }
}

export async function acceptImageFromDialog(): Promise<void> {
  await acceptImageFile(await openImageDialog())
}

export async function acceptDroppedFiles(transfer: DataTransfer | null): Promise<void> {
  const file = findImageFile(transfer?.files ?? null)
  if (!file) {
    errorMessage.value = '画像ファイルをドロップしてください'
    return
  }
  await acceptImageFile(file)
}

export async function acceptPastedItems(transfer: DataTransfer | null): Promise<boolean> {
  const file = findImageInClipboard(transfer?.items ?? null)
  if (!file) return false
  await acceptImageFile(file)
  return true
}
