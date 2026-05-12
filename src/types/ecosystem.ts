export type MoodId =
  | 'abyss'
  | 'neon-jungle'
  | 'quantum-bloom'
  | 'solar-storm'
  | 'frozen-signal'

export type RenderQuality = 'low' | 'medium' | 'high'

export type AudioMode = 'idle' | 'microphone' | 'track'

export interface AudioLevels {
  bass: number
  mid: number
  treble: number
  volume: number
}

export interface MoodProfile {
  id: MoodId
  label: string
  glyph: string
  background: string
  primary: string
  secondary: string
  accent: string
  ember: string
  fog: string
  bloom: number
  motion: number
  density: number
  description: string
}

export interface GardenSettings {
  seed: string
  moodId: MoodId
  quality: RenderQuality
}

export interface FavoriteEcosystem {
  id: string
  name: string
  seed: string
  moodId: MoodId
  createdAt: number
}

export interface GardenStats {
  organisms: number
  particles: number
  fps: number
  idle: number
}
