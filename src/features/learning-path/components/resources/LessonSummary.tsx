import { Markdown } from './Markdown'

export function LessonSummary({ markdown }: { markdown: string | null }) {
  if (!markdown?.trim()) return <p className="lp-res-empty">Bài học này chưa có phần tóm tắt.</p>
  return <Markdown>{markdown}</Markdown>
}
