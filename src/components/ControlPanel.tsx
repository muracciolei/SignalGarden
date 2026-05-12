import {
  Camera,
  Clipboard,
  Disc3,
  Heart,
  Mic,
  Music2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useRef } from 'react'
import { MOODS, getMood } from '../config/moods'
import type {
  AudioLevels,
  AudioMode,
  FavoriteEcosystem,
  GardenStats,
  MoodId,
  RenderQuality,
} from '../types/ecosystem'

interface ControlPanelProps {
  seed: string
  moodId: MoodId
  quality: RenderQuality
  meter: AudioLevels
  audioMode: AudioMode
  audioError: string | null
  isAudioPlaying: boolean
  isAudioSupported: boolean
  favorites: FavoriteEcosystem[]
  stats: GardenStats
  actionStatus: string
  isRecording: boolean
  onMoodChange: (moodId: MoodId) => void
  onQualityChange: (quality: RenderQuality) => void
  onMic: () => void
  onTrack: (file: File) => void
  onToggleTrack: () => void
  onStopAudio: () => void
  onRandomSeed: () => void
  onSaveFavorite: () => void
  onRestoreFavorite: (favorite: FavoriteEcosystem) => void
  onDeleteFavorite: (id: string) => void
  onScreenshot: () => void
  onVideo: () => void
  onShare: () => void
}

export function ControlPanel({
  seed,
  moodId,
  quality,
  meter,
  audioMode,
  audioError,
  isAudioPlaying,
  isAudioSupported,
  favorites,
  stats,
  actionStatus,
  isRecording,
  onMoodChange,
  onQualityChange,
  onMic,
  onTrack,
  onToggleTrack,
  onStopAudio,
  onRandomSeed,
  onSaveFavorite,
  onRestoreFavorite,
  onDeleteFavorite,
  onScreenshot,
  onVideo,
  onShare,
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mood = getMood(moodId)

  return (
    <motion.aside
      className="control-shell"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.65, ease: 'easeOut' }}
    >
      <div className="brand-strip">
        <div>
          <p className="eyebrow">Signal Garden</p>
          <h1>{mood.label}</h1>
        </div>
        <span className="seed-chip" title="Seed">
          {seed}
        </span>
      </div>

      <div className="mood-grid" aria-label="Environment mood">
        {MOODS.map((item) => (
          <button
            className={item.id === moodId ? 'mood-button is-active' : 'mood-button'}
            type="button"
            key={item.id}
            onClick={() => onMoodChange(item.id)}
            title={item.description}
          >
            <span>{item.glyph}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="panel-row">
        <button type="button" className="icon-button" onClick={onMic} disabled={!isAudioSupported} title="Microphone">
          <Mic size={17} aria-hidden="true" />
          Mic
        </button>
        <button type="button" className="icon-button" onClick={() => fileInputRef.current?.click()} title="Audio track">
          <Music2 size={17} aria-hidden="true" />
          Track
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={audioMode === 'track' ? onToggleTrack : onStopAudio}
          disabled={audioMode === 'idle'}
          title={isAudioPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isAudioPlaying ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          {isAudioPlaying ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="icon-button compact" onClick={onStopAudio} title="Stop audio">
          <X size={17} aria-hidden="true" />
        </button>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="audio/*"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]

            if (file) {
              onTrack(file)
              event.currentTarget.value = ''
            }
          }}
        />
      </div>

      <div className="meter-grid" aria-label="Audio meter">
        <Meter label="Bass" value={meter.bass} />
        <Meter label="Mid" value={meter.mid} />
        <Meter label="Treble" value={meter.treble} />
      </div>

      {audioError ? <p className="panel-alert">{audioError}</p> : null}

      <div className="toolbar-grid">
        <button type="button" className="icon-button" onClick={onRandomSeed} title="Random seed">
          <RefreshCw size={17} aria-hidden="true" />
          Seed
        </button>
        <button type="button" className="icon-button" onClick={onSaveFavorite} title="Save ecosystem">
          <Save size={17} aria-hidden="true" />
          Save
        </button>
        <button type="button" className="icon-button" onClick={onShare} title="Copy share link">
          <Clipboard size={17} aria-hidden="true" />
          Share
        </button>
        <button type="button" className="icon-button" onClick={onScreenshot} title="Export screenshot">
          <Camera size={17} aria-hidden="true" />
          Shot
        </button>
        <button type="button" className="icon-button" onClick={onVideo} disabled={isRecording} title="Export video loop">
          <Video size={17} aria-hidden="true" />
          {isRecording ? 'Rec' : 'Loop'}
        </button>
      </div>

      <div className="quality-row">
        <span>
          <SlidersHorizontal size={15} aria-hidden="true" />
          Quality
        </span>
        <div>
          {(['low', 'medium', 'high'] as RenderQuality[]).map((item) => (
            <button
              key={item}
              type="button"
              className={quality === item ? 'quality-button is-active' : 'quality-button'}
              onClick={() => onQualityChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-row">
        <span>
          <Radio size={15} aria-hidden="true" />
          {stats.fps || 60} fps
        </span>
        <span>
          <Disc3 size={15} aria-hidden="true" />
          {stats.organisms} forms
        </span>
        <span>{stats.particles} spores</span>
      </div>

      <div className="favorites-strip">
        <div className="favorites-heading">
          <span>
            <Heart size={15} aria-hidden="true" />
            Favorites
          </span>
          {actionStatus ? <small>{actionStatus}</small> : null}
        </div>
        {favorites.length > 0 ? (
          <div className="favorite-list">
            {favorites.slice(0, 4).map((favorite) => (
              <div className="favorite-item" key={favorite.id}>
                <button type="button" onClick={() => onRestoreFavorite(favorite)} title={favorite.seed}>
                  <span>{favorite.name}</span>
                  <small>{getMood(favorite.moodId).label}</small>
                </button>
                <button type="button" onClick={() => onDeleteFavorite(favorite.id)} title="Delete favorite">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-favorites">No saved seeds yet.</p>
        )}
      </div>

    </motion.aside>
  )
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="meter">
      <span>{label}</span>
      <div>
        <i style={{ transform: `scaleX(${Math.min(1, value).toFixed(3)})` }} />
      </div>
    </div>
  )
}
