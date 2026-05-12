import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioLevels, AudioMode } from '../types/ecosystem'

const SILENCE: AudioLevels = { bass: 0, mid: 0, treble: 0, volume: 0 }

function averageRange(data: Uint8Array, start: number, end: number): number {
  let total = 0
  const safeEnd = Math.min(data.length, Math.max(start + 1, end))

  for (let index = start; index < safeEnd; index += 1) {
    total += data[index]
  }

  return total / (safeEnd - start) / 255
}

export function useAudioAnalyzer() {
  const levelsRef = useRef<AudioLevels>({ ...SILENCE })
  const animationRef = useRef<number | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<AudioNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [meter, setMeter] = useState<AudioLevels>({ ...SILENCE })
  const [mode, setMode] = useState<AudioMode>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const resetSource = useCallback(() => {
    sourceRef.current?.disconnect()
    sourceRef.current = null
    analyserRef.current?.disconnect()

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current.load()
      audioRef.current = null
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    setIsPlaying(false)
  }, [])

  const ensureContext = useCallback(async () => {
    if (!contextRef.current) {
      contextRef.current = new AudioContext()
      analyserRef.current = contextRef.current.createAnalyser()
      analyserRef.current.fftSize = 1024
      analyserRef.current.smoothingTimeConstant = 0.82
    }

    if (contextRef.current.state === 'suspended') {
      await contextRef.current.resume()
    }

    return {
      context: contextRef.current,
      analyser: analyserRef.current!,
    }
  }, [])

  const monitor = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
    }

    let lastMeterUpdate = 0
    const tick = (now: number) => {
      const analyser = analyserRef.current

      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)

        const bass = averageRange(data, 1, 10)
        const mid = averageRange(data, 10, 60)
        const treble = averageRange(data, 60, 190)
        const volume = Math.min(1, bass * 0.52 + mid * 0.32 + treble * 0.24)
        const current = levelsRef.current

        levelsRef.current = {
          bass: current.bass * 0.7 + bass * 0.3,
          mid: current.mid * 0.72 + mid * 0.28,
          treble: current.treble * 0.76 + treble * 0.24,
          volume: current.volume * 0.68 + volume * 0.32,
        }

        if (now - lastMeterUpdate > 90) {
          setMeter(levelsRef.current)
          lastMeterUpdate = now
        }
      }

      animationRef.current = requestAnimationFrame(tick)
    }

    animationRef.current = requestAnimationFrame(tick)
  }, [])

  const startMicrophone = useCallback(async () => {
    try {
      setError(null)
      resetSource()
      const { context, analyser } = await ensureContext()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      const source = context.createMediaStreamSource(stream)
      source.connect(analyser)
      sourceRef.current = source
      streamRef.current = stream
      setMode('microphone')
      setIsPlaying(true)
      monitor()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone unavailable')
      setMode('idle')
    }
  }, [ensureContext, monitor, resetSource])

  const loadTrack = useCallback(
    async (file: File) => {
      try {
        setError(null)
        resetSource()
        const { context, analyser } = await ensureContext()
        const url = URL.createObjectURL(file)
        const audio = new Audio(url)
        audio.loop = true
        audio.preload = 'auto'

        const source = context.createMediaElementSource(audio)
        source.connect(analyser)
        analyser.connect(context.destination)

        await audio.play()
        objectUrlRef.current = url
        sourceRef.current = source
        audioRef.current = audio
        setMode('track')
        setIsPlaying(true)
        monitor()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Audio track unavailable')
        setMode('idle')
      }
    },
    [ensureContext, monitor, resetSource],
  )

  const toggleTrack = useCallback(async () => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (audio.paused) {
      await audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }, [])

  const stop = useCallback(() => {
    resetSource()
    levelsRef.current = { ...SILENCE }
    setMeter({ ...SILENCE })
    setMode('idle')
  }, [resetSource])

  useEffect(
    () => () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }

      resetSource()
      contextRef.current?.close()
    },
    [resetSource],
  )

  return {
    levelsRef,
    meter,
    mode,
    error,
    isPlaying,
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
    startMicrophone,
    loadTrack,
    toggleTrack,
    stop,
  }
}
