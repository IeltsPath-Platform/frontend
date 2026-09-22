import { Check, MessageSquareQuote, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AI_WRITING_FEEDBACK } from "@/lib/mock/aiFeedback"

export function AiAssistantPage() {
  return (
    <main className="page ai-review" id="main-content" tabIndex={-1}>
      <section className="page-hero page-hero--compact"><div><p className="eyebrow">AI Writing review</p><h1>Đọc lại bài viết với một người phản biện kiên nhẫn.</h1><p>So sánh câu gốc, bản cải thiện và lý do để biến feedback thành phản xạ khi viết.</p></div><Dialog><DialogTrigger asChild><Button size="lg"><Sparkles aria-hidden="true" /> Xem rubric IELTS</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Điểm dự đoán: Band 6.5</DialogTitle><DialogDescription>AI feedback là hướng dẫn luyện tập, không thay thế đánh giá chính thức của giám khảo IELTS.</DialogDescription></DialogHeader><div className="rubric-list">{AI_WRITING_FEEDBACK.rubric.map((item) => <div key={item.criterion}><strong>{item.criterion}</strong><span>Band {item.band}</span><p>{item.note}</p></div>)}</div></DialogContent></Dialog></section>
      <Card className="writing-prompt"><CardHeader><MessageSquareQuote aria-hidden="true" /><div><p className="eyebrow">Đề bài</p><CardTitle>Writing Task 2</CardTitle></div></CardHeader><CardContent><p>{AI_WRITING_FEEDBACK.prompt}</p></CardContent></Card>
      <section className="correction-grid" aria-label="So sánh bài viết"><article><p className="eyebrow">Bản gốc</p><h2>Ý của bạn</h2><p>{AI_WRITING_FEEDBACK.original}</p></article><article className="correction-grid__revised"><p className="eyebrow">Bản AI gợi ý</p><h2>Câu rõ nét hơn</h2><p>{AI_WRITING_FEEDBACK.revised}</p></article></section>
      <section className="feedback-grid"><Card><CardHeader><div><p className="eyebrow">Từng dòng một</p><CardTitle>Điểm cần nâng cấp</CardTitle></div></CardHeader><CardContent className="line-feedback">{AI_WRITING_FEEDBACK.lineFeedback.map((item) => <div key={item.source}><mark>{item.source}</mark><p>{item.note}</p></div>)}</CardContent></Card><Card><CardHeader><div><p className="eyebrow">Vocab bank</p><CardTitle>Từ vựng nâng band</CardTitle></div></CardHeader><CardContent><ul className="vocab-list">{AI_WRITING_FEEDBACK.vocabulary.map((word) => <li key={word}><Check aria-hidden="true" /> {word}</li>)}</ul><Button variant="outline">Lưu vào sổ từ vựng</Button></CardContent></Card></section>
    </main>
  )
}
