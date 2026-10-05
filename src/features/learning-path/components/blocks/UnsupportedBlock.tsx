import { Puzzle } from 'lucide-react'
import type { RawBlock } from '~types/learningPath'

function describe(block: RawBlock) {
  const assetType = typeof block.assetType === 'string' ? ` · ${block.assetType}` : ''
  return `${block.type}${assetType}`
}

export function UnsupportedBlock({ block }: { block: RawBlock }) {
  return (
    <div className="lp-unsupported" role="note">
      <Puzzle aria-hidden="true" size={20} />
      <div>
        <p>Nội dung chưa hỗ trợ</p>
        <small>Khối {describe(block)} sẽ hiển thị khi ứng dụng được cập nhật.</small>
      </div>
    </div>
  )
}
