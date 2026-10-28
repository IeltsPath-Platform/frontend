import { useSyncExternalStore } from 'react'
import { buildInitialState, uniqueKeyCode } from './materialize'
import type { Batch, KeyRecord, PointState } from './types'

/**
 * The sample data lives here in memory: every action below changes it so the screens react, and a reload brings the
 * original data back. Nothing is sent to a server.
 */
let state: PointState = buildInitialState()
const listeners = new Set<() => void>()

function commit(next: PointState): void {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePointState(): PointState {
  return useSyncExternalStore(subscribe, () => state)
}

export function resetPointState(): void {
  commit(buildInitialState())
}

export interface NewBatchInput {
  productId: string
  quantity: number
  /** YYYY-MM-DD, or null for keys that never expire. */
  expiresAt: string | null
  year: number
  month: number
}

/** Splits `total` over `parts` as evenly as possible; the first parts take the remainder (334, 333, 333). */
export function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return []
  const base = Math.floor(total / parts)
  const extra = total % parts
  return Array.from({ length: parts }, (_, index) => base + (index < extra ? 1 : 0))
}

export function nextBatchCode(batches: readonly Batch[], year: number, month: number): string {
  const prefix = `B-${String(year).slice(-2)}${String(month).padStart(2, '0')}-`
  const taken = batches.filter((batch) => batch.code.startsWith(prefix)).length
  return `${prefix}${String(taken + 1).padStart(3, '0')}`
}

/** All keys are created together or not at all, like the real transaction. They start in the manager's shared pool. */
export function createBatch(input: NewBatchInput): Batch {
  const code = nextBatchCode(state.batches, input.year, input.month)
  const batch: Batch = {
    code,
    label: `Đợt ${String(input.month).padStart(2, '0')}/${input.year}`,
    productId: input.productId,
    quantity: input.quantity,
    expiresAt: input.expiresAt,
    createdAt: new Date().toISOString(),
    createdBy: state.manager.name,
  }
  const used = new Set(state.keys.map((key) => key.code))
  const keys: KeyRecord[] = Array.from({ length: input.quantity }, (_, index) => ({
    id: `${code}-${index + 1}`,
    code: uniqueKeyCode(Math.random, used),
    batch: code,
    seq: index + 1,
    productId: input.productId,
    saleId: null,
    status: 'READY',
    expiresAt: input.expiresAt,
    issuedAt: null,
    activatedAt: null,
    note: null,
  }))
  commit({ ...state, batches: [...state.batches, batch], keys: [...state.keys, ...keys] })
  return batch
}

/** Hands the lowest-numbered keys still in the shared pool to each sale, in the order given. */
export function allocateKeys(batchCode: string, amounts: Record<string, number>): void {
  const pool = state.keys
    .filter((key) => key.batch === batchCode && key.status === 'READY' && key.saleId === null)
    .sort((a, b) => a.seq - b.seq)
  const owner = new Map<string, string>()
  let cursor = 0
  for (const [saleId, count] of Object.entries(amounts)) {
    for (let i = 0; i < count && cursor < pool.length; i += 1) owner.set(pool[cursor++].id, saleId)
  }
  commit({
    ...state,
    keys: state.keys.map((key) => {
      const saleId = owner.get(key.id)
      return saleId ? { ...key, saleId } : key
    }),
  })
}

const UNUSED = new Set(['READY', 'ISSUED'])

/** A key already activated can never be taken back; everything else unused can. Returns how many changed. */
export function revokeKeys(ids: readonly string[], note: string): number {
  const target = new Set(ids)
  let changed = 0
  commit({
    ...state,
    keys: state.keys.map((key) => {
      if (!target.has(key.id) || !UNUSED.has(key.status)) return key
      changed += 1
      return { ...key, status: 'REVOKED', note }
    }),
  })
  return changed
}

export function revokeUnusedInBatch(batchCode: string, note: string): number {
  return revokeKeys(state.keys.filter((key) => key.batch === batchCode).map((key) => key.id), note)
}

/** Moves keys that have not been handed to a student to another sale. */
export function reassignKeys(ids: readonly string[], saleId: string): number {
  const target = new Set(ids)
  let changed = 0
  commit({
    ...state,
    keys: state.keys.map((key) => {
      if (!target.has(key.id) || key.status !== 'READY') return key
      changed += 1
      return { ...key, saleId }
    }),
  })
  return changed
}

/**
 * The key a sale hands out next for a product, so the sale never has to pick one: the key that expires soonest goes
 * first (a key with no expiry goes last), then the oldest batch, then the lowest number in it.
 */
export function nextKeyToIssue(saleId: string, productId: string): KeyRecord | null {
  const open = state.keys.filter((key) => key.saleId === saleId && key.productId === productId && key.status === 'READY')
  open.sort((a, b) => (a.expiresAt ?? '9999-12-31').localeCompare(b.expiresAt ?? '9999-12-31') || a.batch.localeCompare(b.batch) || a.seq - b.seq)
  return open[0] ?? null
}

export function issueKey(keyId: string): KeyRecord | null {
  let issued: KeyRecord | null = null
  commit({
    ...state,
    keys: state.keys.map((key) => {
      if (key.id !== keyId || key.status !== 'READY') return key
      issued = { ...key, status: 'ISSUED', issuedAt: new Date().toISOString() }
      return issued
    }),
  })
  return issued
}

/** Issues the next key of a product. Null when the sale has none of that product left. */
export function issueNextKey(saleId: string, productId: string): KeyRecord | null {
  const next = nextKeyToIssue(saleId, productId)
  return next ? issueKey(next.id) : null
}
