import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Renders author-written Markdown. Raw HTML is not enabled, so only Markdown syntax reaches the page. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="lp-res-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: ({ href, children: label }) => <a href={href} target="_blank" rel="noopener noreferrer">{label}</a> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
