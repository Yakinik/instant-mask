const DB_NAME = 'instant-mask'
const DB_VERSION = 1
const STORE = 'session'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('保存領域を開けませんでした'))
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE, mode).objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('保存に失敗しました'))
      }).finally(() => db.close()),
  )
}

/** Blob もそのまま置ける保存領域。localStorage と違って容量制限が実用的。 */
export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const value = await runTransaction<unknown>('readonly', (store) => store.get(key))
    return (value as T | undefined) ?? null
  } catch {
    return null
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    await runTransaction('readwrite', (store) => store.put(value, key))
  } catch {
    // 保存できなくても編集は続けられるので握りつぶす
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    await runTransaction('readwrite', (store) => store.delete(key))
  } catch {
    // 同上
  }
}
