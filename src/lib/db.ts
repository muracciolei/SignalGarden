import type { FavoriteEcosystem, GardenSettings } from '../types/ecosystem'

const DB_NAME = 'signal-garden'
const DB_VERSION = 1
const FAVORITES = 'favorites'
const SETTINGS = 'settings'

interface SettingsRecord {
  key: 'active'
  value: GardenSettings
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(FAVORITES)) {
        const store = db.createObjectStore(FAVORITES, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }

      if (!db.objectStoreNames.contains(SETTINGS)) {
        db.createObjectStore(SETTINGS, { keyPath: 'key' })
      }
    }

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode)
        const store = transaction.objectStore(storeName)
        const request = action(store)
        let result: T | undefined

        if (request) {
          request.onsuccess = () => {
            result = request.result
          }
          request.onerror = () => reject(request.error)
        }

        transaction.oncomplete = () => {
          db.close()
          resolve(result)
        }
        transaction.onerror = () => {
          db.close()
          reject(transaction.error)
        }
      }),
  )
}

export async function getFavorites(): Promise<FavoriteEcosystem[]> {
  const favorites = await withStore<FavoriteEcosystem[]>(FAVORITES, 'readonly', (store) =>
    store.getAll(),
  )

  return (favorites ?? []).sort((a, b) => b.createdAt - a.createdAt)
}

export async function saveFavorite(favorite: FavoriteEcosystem): Promise<void> {
  await withStore(FAVORITES, 'readwrite', (store) => {
    store.put(favorite)
  })
}

export async function removeFavorite(id: string): Promise<void> {
  await withStore(FAVORITES, 'readwrite', (store) => {
    store.delete(id)
  })
}

export async function getSettings(): Promise<GardenSettings | null> {
  const record = await withStore<SettingsRecord>(SETTINGS, 'readonly', (store) => store.get('active'))
  return record?.value ?? null
}

export async function saveSettings(settings: GardenSettings): Promise<void> {
  await withStore(SETTINGS, 'readwrite', (store) => {
    store.put({ key: 'active', value: settings } satisfies SettingsRecord)
  })
}
