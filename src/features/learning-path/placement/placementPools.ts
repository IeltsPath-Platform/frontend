import type { PlacementPool } from '~types/learningPath'

export const PLACEMENT_POOLS: readonly { pool: PlacementPool; label: string; ceiling: number; description: string }[] = [
  { pool: 'BAND_0_3', label: 'Band 0–3', ceiling: 3, description: 'Dành cho người mới bắt đầu hoặc đang xây nền tảng.' },
  { pool: 'BAND_3_5', label: 'Band 3–5', ceiling: 5, description: 'Dành cho người đã có nền tảng cơ bản.' },
  { pool: 'BAND_5_9', label: 'Band 5–9', ceiling: 9, description: 'Dành cho người đã quen với các dạng bài IELTS.' },
]

export function placementPoolLabel(pool: PlacementPool | null) {
  return PLACEMENT_POOLS.find((item) => item.pool === pool)?.label ?? 'Chưa xác định'
}

export function placementPoolCeiling(pool: PlacementPool | null) {
  return PLACEMENT_POOLS.find((item) => item.pool === pool)?.ceiling ?? null
}
