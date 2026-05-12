import { AnimatePresence } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { FooterSupport } from './components/FooterSupport'
import { LoadingScreen } from './components/LoadingScreen'
import { SignalGardenScene, type SignalGardenSceneHandle } from './components/SignalGardenScene'
import { SupportButton } from './components/SupportButton'
import { downloadBlob, downloadDataUrl } from './lib/download'
import { createShareUrl, makeSeed } from './lib/seed'
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer'
import { usePersistedGarden } from './hooks/usePersistedGarden'
import type { GardenStats } from './types/ecosystem'

function App() {
  const sceneRef = useRef<SignalGardenSceneHandle | null>(null)
  const audio = useAudioAnalyzer()
  const {
    settings,
    favorites,
    updateSeed,
    updateMood,
    updateQuality,
    addFavorite,
    deleteFavorite,
    restoreFavorite,
  } = usePersistedGarden()
  const [loaded, setLoaded] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [actionStatus, setActionStatus] = useState('')
  const [stats, setStats] = useState<GardenStats>({
    organisms: 0,
    particles: 0,
    fps: 60,
    idle: 0,
  })

  const showStatus = useCallback((message: string) => {
    setActionStatus(message)
    window.setTimeout(() => setActionStatus(''), 2200)
  }, [])

  const handleReady = useCallback(() => {
    window.setTimeout(() => setLoaded(true), 450)
  }, [])

  const handleStats = useCallback((next: GardenStats) => {
    setStats(next)
  }, [])

  const handleRandomSeed = () => {
    setLoaded(false)
    updateSeed(makeSeed())
    showStatus('New seed')
  }

  const handleScreenshot = () => {
    const dataUrl = sceneRef.current?.captureScreenshot()

    if (!dataUrl) {
      return
    }

    downloadDataUrl(dataUrl, `signal-garden-${settings.seed}.png`)
    showStatus('Screenshot exported')
  }

  const handleVideo = async () => {
    try {
      setIsRecording(true)
      showStatus('Recording loop')
      const blob = await sceneRef.current?.recordVideo(5200)

      if (blob) {
        downloadBlob(blob, `signal-garden-${settings.seed}.webm`)
        showStatus('Video loop exported')
      }
    } catch (error) {
      showStatus(error instanceof Error ? error.message : 'Video export unavailable')
    } finally {
      setIsRecording(false)
    }
  }

  const handleShare = async () => {
    const url = createShareUrl(settings.seed, settings.moodId)
    window.history.replaceState(null, '', url)

    try {
      await navigator.clipboard.writeText(url)
      showStatus('Seed link copied')
    } catch {
      showStatus('Seed link ready')
    }
  }

  const handleSaveFavorite = async () => {
    try {
      await addFavorite()
      showStatus('Saved locally')
    } catch {
      showStatus('Local save unavailable')
    }
  }

  const handleDeleteFavorite = async (id: string) => {
    try {
      await deleteFavorite(id)
      showStatus('Removed')
    } catch {
      showStatus('Local save unavailable')
    }
  }

  return (
    <>
      <main className="app-shell">
        <section className="experience-stage" aria-label="Signal Garden ecosystem">
          <SignalGardenScene
            ref={sceneRef}
            seed={settings.seed}
            moodId={settings.moodId}
            quality={settings.quality}
            audioRef={audio.levelsRef}
            onReady={handleReady}
            onStats={handleStats}
          />
          <div className="stage-vignette" aria-hidden="true" />
          <SupportButton />
          <ControlPanel
            seed={settings.seed}
            moodId={settings.moodId}
            quality={settings.quality}
            meter={audio.meter}
            audioMode={audio.mode}
            audioError={audio.error}
            isAudioPlaying={audio.isPlaying}
            isAudioSupported={audio.isSupported}
            favorites={favorites}
            stats={stats}
            actionStatus={actionStatus}
            isRecording={isRecording}
            onMoodChange={updateMood}
            onQualityChange={updateQuality}
            onMic={() => {
              if (audio.mode === 'microphone') {
                audio.stop()
              } else {
                audio.startMicrophone()
              }
            }}
            onTrack={audio.loadTrack}
            onToggleTrack={audio.toggleTrack}
            onStopAudio={audio.stop}
            onRandomSeed={handleRandomSeed}
            onSaveFavorite={handleSaveFavorite}
            onRestoreFavorite={restoreFavorite}
            onDeleteFavorite={handleDeleteFavorite}
            onScreenshot={handleScreenshot}
            onVideo={handleVideo}
            onShare={handleShare}
          />
        </section>

        <FooterSupport />
      </main>

      <AnimatePresence>{!loaded ? <LoadingScreen visible key="loading" /> : null}</AnimatePresence>
    </>
  )
}

export default App
