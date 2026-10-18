export const COMPOSER_BACKGROUND_KEYS = [
  'VIOLET',
  'CRIMSON',
  'MIDNIGHT',
  'SUNSET',
  'OCEAN',
  'FOREST',
  'ROSE',
  'AURORA',
] as const

export type ComposerBackgroundKey = (typeof COMPOSER_BACKGROUND_KEYS)[number]

export interface ComposerBackgroundConfig {
  key: ComposerBackgroundKey
  label: string
  gradient: string
  swatchGradient: string
  textColor: string
  textShadow?: string
}

export const COMPOSER_BACKGROUNDS: Record<ComposerBackgroundKey, ComposerBackgroundConfig> = {
  VIOLET: {
    key: 'VIOLET',
    label: 'Tím mộng mơ',
    gradient: 'linear-gradient(135deg, #6b21a8 0%, #4c1d95 50%, #2e1065 100%)',
    swatchGradient: 'linear-gradient(135deg, #9333ea, #4c1d95)',
    textColor: '#ffffff',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
  },
  CRIMSON: {
    key: 'CRIMSON',
    label: 'Đỏ thẫm',
    gradient: 'linear-gradient(135deg, #be123c 0%, #881337 50%, #4c0519 100%)',
    swatchGradient: 'linear-gradient(135deg, #e11d48, #881337)',
    textColor: '#ffffff',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
  },
  MIDNIGHT: {
    key: 'MIDNIGHT',
    label: 'Đêm huyền bí',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)',
    swatchGradient: 'linear-gradient(135deg, #334155, #0f172a)',
    textColor: '#ffffff',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
  },
  SUNSET: {
    key: 'SUNSET',
    label: 'Hoàng hôn',
    gradient: 'linear-gradient(135deg, #c2410c 0%, #9a3412 50%, #431407 100%)',
    swatchGradient: 'linear-gradient(135deg, #ea580c, #9a3412)',
    textColor: '#ffffff',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
  },
  OCEAN: {
    key: 'OCEAN',
    label: 'Đại dương',
    gradient: 'linear-gradient(135deg, #0369a1 0%, #075985 50%, #082f49 100%)',
    swatchGradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
    textColor: '#ffffff',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
  },
  FOREST: {
    key: 'FOREST',
    label: 'Rừng xanh',
    gradient: 'linear-gradient(135deg, #047857 0%, #065f46 50%, #022c22 100%)',
    swatchGradient: 'linear-gradient(135deg, #059669, #064e3b)',
    textColor: '#ffffff',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
  },
  ROSE: {
    key: 'ROSE',
    label: 'Hồng ngọt ngào',
    gradient: 'linear-gradient(135deg, #a21caf 0%, #701a75 50%, #4a044e 100%)',
    swatchGradient: 'linear-gradient(135deg, #c026d3, #701a75)',
    textColor: '#ffffff',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
  },
  AURORA: {
    key: 'AURORA',
    label: 'Cực quang',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #1e1b4b 60%, #311042 100%)',
    swatchGradient: 'linear-gradient(135deg, #14b8a6, #312e81)',
    textColor: '#ffffff',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
  },
}

export const MAX_BACKGROUND_POST_LENGTH = 280

export function isComposerBackgroundKey(value: unknown): value is ComposerBackgroundKey {
  return typeof value === 'string' && COMPOSER_BACKGROUND_KEYS.includes(value as ComposerBackgroundKey)
}

export function getComposerBackground(key: string | null | undefined): ComposerBackgroundConfig | null {
  if (!key || !isComposerBackgroundKey(key)) return null
  return COMPOSER_BACKGROUNDS[key] ?? null
}

export function canApplyBackground(body: string, imageUrlsCount: number, hasVideo: boolean): boolean {
  if (imageUrlsCount > 0 || hasVideo) return false
  return body.trim().length <= MAX_BACKGROUND_POST_LENGTH
}
