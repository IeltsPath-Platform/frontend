import type { TextBlockData } from '~types/learningPath'

export function TextBlock({ block }: { block: TextBlockData }) {
  return <div className="lp-text">{block.text}</div>
}
