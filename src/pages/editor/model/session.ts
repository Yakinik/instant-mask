import { effect } from '@preact/signals'

import { decodeImageFile, idbDelete, idbGet, idbSet } from '@/shared/lib'

import {
  image,
  layers,
  maskEffect,
  maskShape,
  maskSoftness,
  maskStrength,
  restoreState,
  stampStyle,
} from './editor'
import { DEFAULT_STAMP_STYLE, type StampStyle } from './emoji'
import type { Layer } from './layer'
import type { MaskEffect, MaskShape } from './mask'

const SESSION_KEY = 'session'
const SESSION_VERSION = 1
const SAVE_DELAY = 500

interface StoredSession {
  version: number
  image: { blob: Blob; name: string; type: string }
  layers: Layer[]
  defaults: {
    effect: MaskEffect
    shape: MaskShape
    strength: number
    softness: number
  }
  stampStyle: StampStyle
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false
  const session = value as Partial<StoredSession>
  return (
    session.version === SESSION_VERSION &&
    !!session.image &&
    session.image.blob instanceof Blob &&
    Array.isArray(session.layers)
  )
}

/**
 * 前回の編集状態を復元する。復元できたら true。
 * 画像は Blob のまま保存してあるので、読み直してデコードする。
 */
export async function restoreSession(): Promise<boolean> {
  const stored = await idbGet<unknown>(SESSION_KEY)
  if (!isStoredSession(stored)) return false
  try {
    const file = new File([stored.image.blob], stored.image.name || 'image', {
      type: stored.image.type || stored.image.blob.type,
    })
    const loaded = await decodeImageFile(file)
    restoreState(loaded, stored.layers)
    if (stored.defaults) {
      maskEffect.value = stored.defaults.effect
      maskShape.value = stored.defaults.shape
      maskStrength.value = stored.defaults.strength
      maskSoftness.value = stored.defaults.softness
    }
    stampStyle.value = { ...DEFAULT_STAMP_STYLE, ...stored.stampStyle }
    return true
  } catch {
    // 壊れていたら捨てて、まっさらな状態で始める
    await idbDelete(SESSION_KEY)
    return false
  }
}

/** 画像・レイヤ・既定設定の変化を拾って保存する。まとめて書くためにデバウンスする。 */
export function startSessionAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined

  const dispose = effect(() => {
    const current = image.value
    const snapshot: StoredSession | null = current
      ? {
          version: SESSION_VERSION,
          image: { blob: current.blob, name: current.name, type: current.type },
          layers: layers.value,
          defaults: {
            effect: maskEffect.value,
            shape: maskShape.value,
            strength: maskStrength.value,
            softness: maskSoftness.value,
          },
          stampStyle: stampStyle.value,
        }
      : null

    clearTimeout(timer)
    timer = setTimeout(() => {
      void (snapshot ? idbSet(SESSION_KEY, snapshot) : idbDelete(SESSION_KEY))
    }, SAVE_DELAY)
  })

  return () => {
    clearTimeout(timer)
    dispose()
  }
}

export async function clearSession(): Promise<void> {
  await idbDelete(SESSION_KEY)
}
