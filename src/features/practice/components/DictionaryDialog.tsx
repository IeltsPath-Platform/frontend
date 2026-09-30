import { ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const PASSAGE_GLOSSARY: Record<string, string> = {
  snow: 'tuyết', snowflake: 'bông tuyết', 'snow gun': 'máy phun tuyết', skiing: 'trượt tuyết',
  'ski slopes': 'các sườn dốc trượt tuyết', profitable: 'có lợi nhuận', dependent: 'phụ thuộc',
  equipment: 'thiết bị', 'water vapour': 'hơi nước', atmosphere: 'khí quyển',
  droplets: 'những giọt nhỏ', condenses: 'ngưng tụ', 'ice crystals': 'tinh thể băng',
  'air compressor': 'máy nén khí', artificial: 'nhân tạo', agriculture: 'nông nghiệp',
  'carbon footprints': 'lượng phát thải carbon', 'water tables': 'mực nước ngầm',
}

export function DictionaryDialog({ text, onClose }: { text: string; onClose: () => void }) {
  const word = text.trim().toLowerCase().replace(/^[\s.,;:!?]+|[\s.,;:!?]+$/g, '')
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent>
      <DialogHeader><DialogTitle>Tra từ vựng</DialogTitle><DialogDescription>Từ điển nhỏ của bài đọc. Có thể tra cứu thêm trên Wiktionary.</DialogDescription></DialogHeader>
      <strong className="break-words text-xl">{text}</strong>
      <p>{PASSAGE_GLOSSARY[word] || 'Chưa có nghĩa trong từ điển của bài. Hãy chọn một từ/cụm từ ngắn hoặc mở trang tra cứu bên dưới.'}</p>
      <a className="flex items-center gap-2 text-sm underline" target="_blank" rel="noopener noreferrer" href={`https://en.wiktionary.org/w/index.php?search=${encodeURIComponent(text.slice(0, 200))}`}>Tra trên Wiktionary (tab mới) <ExternalLink size={16} /></a>
    </DialogContent></Dialog>
  )
}
