import { signal } from '@preact/signals'

const STORAGE_KEY = 'instant-mask:stamps'
const LIMIT = 16

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, LIMIT)
  } catch {
    // 壊れていたら履歴なしで始める
    return []
  }
}

/** 入力欄から追加した絵文字・文字を新しい順に保持する。 */
export const stampHistory = signal<string[]>(read())

export function rememberStamp(text: string): void {
  const value = text.trim()
  if (!value) return
  const next = [value, ...stampHistory.value.filter((item) => item !== value)].slice(
    0,
    LIMIT,
  )
  stampHistory.value = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // 保存できなくても編集は続けられるので握りつぶす
  }
}

export function clearStampHistory(): void {
  stampHistory.value = []
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 同上
  }
}
