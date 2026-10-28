import { CEFR_LEVELS, type CefrLevel } from '../../knowledge-graph/types'

type Option = { skill?: string | null; cefrLevel?: CefrLevel | null }

/** The CEFR level of a course band, the same upper bounds the course analysis uses. */
export function cefrForBand(band: number): CefrLevel | null {
  const upper: Array<[CefrLevel, number]> = [['A1', 2], ['A2', 3.5], ['B1', 4.5], ['B2', 6], ['C1', 7.5], ['C2', 9]]
  return upper.find(([, limit]) => band <= limit)?.[0] ?? null
}

/**
 * The levels worth offering for a band: its own level and the one right below it, highest first. Lower points are not
 * picked by hand; the generator adds the ones a picked point depends on as foundation.
 */
export function courseKnowledgeLevels(band: number): CefrLevel[] {
  const level = cefrForBand(band)
  if (!level) return []
  const top = CEFR_LEVELS.indexOf(level)
  return CEFR_LEVELS.slice(Math.max(0, top - 1), top + 1).reverse()
}

/**
 * The knowledge points worth offering for a course request: the ones of the picked skills (or shared by all of them),
 * at the band's level or the one below, highest level first. A point without a level, such as an error trap, is not a
 * lesson to teach, so it is left out.
 */
export function courseKnowledgeOptions<T extends Option>(nodes: readonly T[], band: number, skills: readonly string[]): T[] {
  const levels = courseKnowledgeLevels(band)
  const rank = (node: T) => (node.cefrLevel ? CEFR_LEVELS.indexOf(node.cefrLevel) : -1)
  return nodes
    .filter((node) => !!node.cefrLevel && levels.includes(node.cefrLevel) && (!node.skill || node.skill === 'ALL' || skills.includes(node.skill)))
    .sort((left, right) => rank(right) - rank(left))
}
