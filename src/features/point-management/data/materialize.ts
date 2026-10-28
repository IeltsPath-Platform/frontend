import raw from './mock-data.json'
import type { Batch, KeyRecord, KeyStatus, PointState, Product, Sale } from './types'

interface Segment {
  saleId: string | null
  ready?: number
  issued?: number
  activated?: number
  revoked?: number
}

interface PinnedKey {
  batch: string
  saleId: string | null
  status: KeyStatus
  code: string
  issuedAt?: string
  activatedAt?: string
}

type RawBatch = Batch & { segments: Segment[] }

interface RawData {
  seedNow: string
  defaultExpiresAt: string
  manager: PointState['manager']
  currentSaleId: string
  products: Product[]
  sales: Sale[]
  batches: RawBatch[]
  pinnedKeys: PinnedKey[]
}

const data = raw as unknown as RawData

/** No 0, 1, I or O, so a code read aloud over Zalo is not misheard. */
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const HOUR_MS = 3_600_000
const FIRST_ACTIVITY_MS = Date.parse('2026-10-01T00:00:00+07:00')

function seedOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return hash >>> 0
}

/** A small deterministic generator so the sample data is the same on every load. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Same shape the backend issues: IP-XXXX-XXXX-XXXX. */
export function randomKeyCode(next: () => number): string {
  const group = () => Array.from({ length: 4 }, () => CHARSET[Math.floor(next() * CHARSET.length)]).join('')
  return `IP-${group()}-${group()}-${group()}`
}

export function uniqueKeyCode(next: () => number, used: Set<string>): string {
  let code = randomKeyCode(next)
  while (used.has(code)) code = randomKeyCode(next)
  used.add(code)
  return code
}

function expandBatch(batch: RawBatch, seedNowMs: number): KeyRecord[] {
  const rng = mulberry32(seedOf(batch.code))
  const used = new Set<string>()
  const slots: { saleId: string | null; status: KeyStatus }[] = []
  for (const seg of batch.segments) {
    const parts: [KeyStatus, number | undefined][] = [
      ['READY', seg.ready], ['ISSUED', seg.issued], ['ACTIVATED', seg.activated], ['REVOKED', seg.revoked],
    ]
    for (const [status, count] of parts) for (let i = 0; i < (count ?? 0); i += 1) slots.push({ saleId: seg.saleId, status })
  }

  const blank = (status: KeyStatus, saleId: string | null, code: string): KeyRecord => ({
    id: '', code, batch: batch.code, seq: 0, productId: batch.productId, saleId, status, expiresAt: batch.expiresAt,
    issuedAt: null, activatedAt: null,
    note: status === 'REVOKED' ? 'Cấp nhầm sản phẩm' : null,
  })

  const records: KeyRecord[] = []
  // Pinned keys are the ones the mockups show by name; they take the first sequence numbers of their batch.
  for (const pin of data.pinnedKeys.filter((p) => p.batch === batch.code)) {
    const at = slots.findIndex((s) => s.saleId === pin.saleId && s.status === pin.status)
    if (at < 0) throw new Error(`Pinned key ${pin.code} has no slot in ${batch.code}`)
    slots.splice(at, 1)
    used.add(pin.code)
    records.push({
      ...blank(pin.status, pin.saleId, pin.code),
      issuedAt: pin.issuedAt ?? null,
      activatedAt: pin.activatedAt ?? null,
    })
  }

  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[slots[i], slots[j]] = [slots[j], slots[i]]
  }

  const from = Math.max(Date.parse(batch.createdAt), FIRST_ACTIVITY_MS)
  for (const slot of slots) {
    const key = blank(slot.status, slot.saleId, uniqueKeyCode(rng, used))
    if (slot.status === 'ISSUED' || slot.status === 'ACTIVATED') {
      const issuedMs = from + rng() * (seedNowMs - from)
      key.issuedAt = new Date(issuedMs).toISOString()
      if (slot.status === 'ACTIVATED') {
        key.activatedAt = new Date(Math.min(seedNowMs, issuedMs + (1 + rng() * 47) * HOUR_MS)).toISOString()
      }
    }
    records.push(key)
  }

  return records.map((key, index) => ({ ...key, seq: index + 1, id: `${batch.code}-${index + 1}` }))
}

export function buildInitialState(): PointState {
  const seedNowMs = Date.parse(data.seedNow)
  return {
    manager: data.manager,
    currentSaleId: data.currentSaleId,
    defaultExpiresAt: data.defaultExpiresAt,
    products: data.products,
    sales: data.sales,
    batches: data.batches.map((batch): Batch => ({
      code: batch.code,
      label: batch.label,
      productId: batch.productId,
      quantity: batch.quantity,
      expiresAt: batch.expiresAt,
      createdAt: batch.createdAt,
      createdBy: batch.createdBy,
    })),
    keys: data.batches.flatMap((batch) => expandBatch(batch, seedNowMs)),
  }
}
