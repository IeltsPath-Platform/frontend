import type { Components } from 'react-markdown'
import { ListBlock, SummaryNote, TableBlock } from './summary-blocks'
import type { HNode } from './summary-shapes'

/** Markdown elements, mapped to the summary's look. */
export const SUMMARY_COMPONENTS: Components = {
  ul: ({ node }) => <ListBlock node={node as unknown as HNode} />,
  ol: ({ node }) => <ListBlock node={node as unknown as HNode} />,
  table: ({ node, children }) => <TableBlock node={node as unknown as HNode}>{children}</TableBlock>,
  blockquote: ({ children }) => <SummaryNote>{children}</SummaryNote>,
  h3: ({ children }) => <h4 className="lp-sum__sub">{children}</h4>,
  h4: ({ children }) => <h4 className="lp-sum__sub">{children}</h4>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
}
