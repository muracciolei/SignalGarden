import { useEffect, useRef, useState } from 'react'
import { DEFAULT_MOOD_ID, isMoodId } from '../config/moods'
import { getFavorites, getSettings, removeFavorite, saveFavorite, saveSettings } from '../lib/db'
import { makeSeed, normalizeSeed } from '../lib/seed'
import type { FavoriteEcosystem, GardenSettings, MoodId, RenderQuality } from '../types/ecosystem'

function getInitialSettings(): GardenSettings {
  const params = new URLSearchParams(window.location.search)
  const urlSeed = normalizeSeed(params.get('seed') ?? '')
  const urlMood = params.get('mood')

  return {
    seed: urlSeed || makeSeed(),
    moodId: isMoodId(urlMood) ? urlMood : DEFAULT_MOOD_ID,
    quality: window.matchMedia('(max-width: 760px)').matches ? 'medium' : 'high',
  }
}

export function usePersistedGarden() {
  const [settings, setSettings] = useState<GardenSettings>(() => getInitialSettings())
  const [favorites, setFavorites] = useState<FavoriteEcosystem[]>([])
  const hydratedRef = useRef(false)
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const [storedSettings, storedFavorites] = await Promise.all([getSettings(), getFavorites()])

      if (cancelled) {
        return
      }

      const params = new URLSearchParams(window.location.search)
      const hasUrlSeed = params.has('seed')

      if (storedSettings && !hasUrlSeed) {
        setSettings(storedSettings)
      }

      setFavorites(storedFavorites)
      hydratedRef.current = true
    }

    hydrate().catch(() => {
      hydratedRef.current = true
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }

    const timeout = window.setTimeout(() => {
      saveSettings(settingsRef.current).catch(() => undefined)
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [settings])

  const updateSeed = (seed: string) => {
    setSettings((current) => ({ ...current, seed: normalizeSeed(seed) || makeSeed() }))
  }

  const updateMood = (moodId: MoodId) => {
    setSettings((current) => ({ ...current, moodId }))
  }

  const updateQuality = (quality: RenderQuality) => {
    setSettings((current) => ({ ...current, quality }))
  }

  const addFavorite = async () => {
    const favorite: FavoriteEcosystem = {
      id: crypto.randomUUID(),
      name: `Garden ${settings.seed.slice(0, 6)}`,
      seed: settings.seed,
      moodId: settings.moodId,
      createdAt: Date.now(),
    }

    await saveFavorite(favorite)
    setFavorites((current) => [favorite, ...current])
  }

  const deleteFavorite = async (id: string) => {
    await removeFavorite(id)
    setFavorites((current) => current.filter((favorite) => favorite.id !== id))
  }

  const restoreFavorite = (favorite: FavoriteEcosystem) => {
    setSettings((current) => ({
      ...current,
      seed: favorite.seed,
      moodId: favorite.moodId,
    }))
  }

  return {
    settings,
    favorites,
    setSettings,
    updateSeed,
    updateMood,
    updateQuality,
    addFavorite,
    deleteFavorite,
    restoreFavorite,
  }
}
