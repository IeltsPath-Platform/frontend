import type { RubricVersion } from '../types'

export function nextRubricVersion(versions: readonly RubricVersion[]): number {
  return versions.reduce((highest, item) => Math.max(highest, item.version), 0) + 1
}
