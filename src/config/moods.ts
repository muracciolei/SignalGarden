import type { MoodId, MoodProfile } from '../types/ecosystem'

export const MOODS: MoodProfile[] = [
  {
    id: 'abyss',
    label: 'Abyss',
    glyph: 'A',
    background: '#02030a',
    primary: '#58f3ff',
    secondary: '#7c4dff',
    accent: '#85ffb7',
    ember: '#ff6bcb',
    fog: '#08112a',
    bloom: 0.46,
    motion: 0.72,
    density: 0.92,
    description: 'Deep signal water and quiet bioluminescence.',
  },
  {
    id: 'neon-jungle',
    label: 'Neon Jungle',
    glyph: 'N',
    background: '#06130f',
    primary: '#85ffb7',
    secondary: '#00d9ff',
    accent: '#ff4fd8',
    ember: '#ffb86b',
    fog: '#102315',
    bloom: 0.54,
    motion: 0.95,
    density: 1.18,
    description: 'Feral chroma vines and quick photosynthetic pulses.',
  },
  {
    id: 'quantum-bloom',
    label: 'Quantum Bloom',
    glyph: 'Q',
    background: '#090317',
    primary: '#ff4fd8',
    secondary: '#58f3ff',
    accent: '#f8ff7a',
    ember: '#b088ff',
    fog: '#170a2a',
    bloom: 0.6,
    motion: 1.12,
    density: 1.05,
    description: 'Soft probability flowers folding through themselves.',
  },
  {
    id: 'solar-storm',
    label: 'Solar Storm',
    glyph: 'S',
    background: '#160604',
    primary: '#ffb86b',
    secondary: '#ff4f70',
    accent: '#58f3ff',
    ember: '#f8ff7a',
    fog: '#2a0f08',
    bloom: 0.68,
    motion: 1.32,
    density: 0.98,
    description: 'Radiant flare weather and charged plasma spores.',
  },
  {
    id: 'frozen-signal',
    label: 'Frozen Signal',
    glyph: 'F',
    background: '#031019',
    primary: '#c7f5ff',
    secondary: '#58f3ff',
    accent: '#b088ff',
    ember: '#85ffb7',
    fog: '#0a1f2c',
    bloom: 0.38,
    motion: 0.54,
    density: 0.82,
    description: 'Crystalline latency, bright frost, and slow data ice.',
  },
]

export const DEFAULT_MOOD_ID: MoodId = 'abyss'

export function getMood(id: MoodId): MoodProfile {
  return MOODS.find((mood) => mood.id === id) ?? MOODS[0]
}

export function isMoodId(value: string | null): value is MoodId {
  return MOODS.some((mood) => mood.id === value)
}
