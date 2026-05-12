const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeSeed(length = 10): string {
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)

  return Array.from(values, (value) => SEED_ALPHABET[value % SEED_ALPHABET.length]).join('')
}

export function hashSeed(seed: string): number {
  let hash = 2166136261

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function createPrng(seed: string): () => number {
  let value = hashSeed(seed) || 1

  return () => {
    value += 0x6d2b79f5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

export function normalizeSeed(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 18)
}

export function createShareUrl(seed: string, moodId: string): string {
  const url = new URL(window.location.href)
  url.searchParams.set('seed', seed)
  url.searchParams.set('mood', moodId)
  return url.toString()
}
