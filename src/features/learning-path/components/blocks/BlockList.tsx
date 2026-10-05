import type { RawBlock } from '~types/learningPath'
import { groupBlocks } from '../../lib/groupBlocks'
import { renderBlock, type BlockRenderContext } from './blockRegistry'
import { PassageBlock } from './PassageBlock'

export function BlockList({ blocks, context }: { blocks: RawBlock[]; context: BlockRenderContext }) {
  return (
    <div className="lp-blocks">
      {groupBlocks(blocks).map((segment) => segment.kind === 'single' ? (
        <div className="lp-block" key={segment.block.id}>{renderBlock(segment.block, context)}</div>
      ) : (
        <div className="lp-split" key={segment.passage.id}>
          <div className="lp-split__passage"><PassageBlock passage={segment.passage} /></div>
          <div className="lp-split__work">
            {segment.blocks.map((block) => <div className="lp-block" key={block.id}>{renderBlock(block, context)}</div>)}
          </div>
        </div>
      ))}
    </div>
  )
}
