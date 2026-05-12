import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { getMood } from '../config/moods'
import type { GardenEngine } from '../three/GardenEngine'
import type { AudioLevels, GardenStats, MoodId, RenderQuality } from '../types/ecosystem'

export interface SignalGardenSceneHandle {
  captureScreenshot: () => string | null
  recordVideo: (durationMs?: number) => Promise<Blob>
}

interface SignalGardenSceneProps {
  seed: string
  moodId: MoodId
  quality: RenderQuality
  audioRef: MutableRefObject<AudioLevels>
  onReady: () => void
  onStats: (stats: GardenStats) => void
}

export const SignalGardenScene = forwardRef<SignalGardenSceneHandle, SignalGardenSceneProps>(
  ({ seed, moodId, quality, audioRef, onReady, onStats }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const engineRef = useRef<GardenEngine | null>(null)
    const latestMoodIdRef = useRef(moodId)

    useImperativeHandle(
      ref,
      () => ({
        captureScreenshot: () => engineRef.current?.captureStill() ?? null,
        recordVideo: (durationMs = 5000) => {
          if (!engineRef.current) {
            return Promise.reject(new Error('Signal Garden is still waking up.'))
          }

          return engineRef.current.recordLoop(durationMs)
        },
      }),
      [],
    )

    useEffect(() => {
      const container = containerRef.current

      if (!container) {
        return undefined
      }

      let active = true
      let localEngine: GardenEngine | null = null

      import('../three/GardenEngine').then(({ GardenEngine }) => {
        if (!active) {
          return
        }

        const engine = new GardenEngine({
          container,
          seed,
          mood: getMood(latestMoodIdRef.current),
          quality,
          audioRef,
          onFrame: onStats,
        })
        localEngine = engine
        engineRef.current = engine
        onReady()
      })

      return () => {
        active = false
        localEngine?.dispose()
        if (engineRef.current === localEngine) {
          engineRef.current = null
        }
      }
    }, [audioRef, onReady, onStats, quality, seed])

    useEffect(() => {
      latestMoodIdRef.current = moodId
      engineRef.current?.setMood(getMood(moodId))
    }, [moodId])

    useEffect(() => {
      engineRef.current?.setQuality(quality)
    }, [quality])

    return <div ref={containerRef} className="absolute inset-0 overflow-hidden" />
  },
)

SignalGardenScene.displayName = 'SignalGardenScene'
