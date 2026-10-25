import type { ErrorHint } from '~types/learningPath'

/** Wire shape of a named mistake: the `error` of a wrong answer and the `errorTrap` of a review or basket item. */
export type ErrorHintDto = {
  code?: string | null
  name?: string | null
  fixHint?: string | null
}

/**
 * The backend names a mistake on a best-effort basis, so anything without a code and a name is treated as absent; a
 * missing hint is tolerated and shown as just the name.
 */
export function mapErrorHint(dto: ErrorHintDto | null | undefined): ErrorHint | undefined {
  const code = dto?.code?.trim()
  const name = dto?.name?.trim()
  if (!code || !name) return undefined
  return { code, name, fixHint: dto?.fixHint?.trim() ?? '' }
}
