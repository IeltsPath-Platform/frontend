import { LessonKnowledgeField } from '../../lessons/components/LessonKnowledgeField'

export interface LinkedKnowledgePoint { knowledgePointId: string; weight: number }

/**
 * Links a question version to the active knowledge points it tests, with the same field the lessons use: the chosen
 * points as a table, and a button that opens the big picker. Every new link has weight 1; a link kept keeps its weight.
 */
export function KnowledgePointPicker({ value, onChange, skill, disabled }: {
  value: LinkedKnowledgePoint[]
  onChange: (next: LinkedKnowledgePoint[]) => void
  /** The skill of the question: the picker opens on its points. */
  skill?: string | null
  disabled?: boolean
}) {
  return <LessonKnowledgeField
    disabled={disabled}
    onChange={(ids) => onChange(ids.map((id) => value.find((item) => item.knowledgePointId === id) ?? { knowledgePointId: id, weight: 1 }))}
    skill={skill}
    title="Knowledge point liên quan"
    value={value.map((item) => item.knowledgePointId)} />
}
