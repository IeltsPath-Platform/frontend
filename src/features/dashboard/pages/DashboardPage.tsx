import { ArrowRight, Bot, ChevronRight, Sparkles, Target } from "lucide-react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MONTHLY_PROGRESS, RECENT_SUBMISSIONS, SKILL_BREAKDOWN } from "@/lib/mock/dashboard"
import { useAuthStore } from "@/features/auth/store/useAuthStore"

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const progressPoints = MONTHLY_PROGRESS.map((point, index) => `${index * 20},${100 - point.band * 10}`).join(" ")

  return (
    <main className="page dashboard" id="main-content" tabIndex={-1}>
      <section className="dashboard-welcome"><div><p className="eyebrow">Bảng tiến độ</p><h1>{user?.fullName.split(" ").slice(-1)}, band đang ở 7.0.</h1><p>Reading giữ nhịp. Việc tiếp theo là viết lại câu chủ đề ở Task 2 trước khi làm full test.</p></div><Button asChild size="lg"><Link to="/practice">Làm đề tiếp theo <ArrowRight aria-hidden="true" /></Link></Button></section>

      <section className="dashboard-overview" aria-label="Tổng quan điểm số">
        <Card className="overall-band-card"><CardContent><p>Overall band dự đoán</p><strong>7.0</strong><div><Badge>+0.5 so với tháng trước</Badge><span><Target aria-hidden="true" /> Target {user?.targetBand ?? 7.5}</span></div></CardContent></Card>
        <Card className="progress-card"><CardHeader><div><p className="eyebrow">Xu hướng sáu tháng</p><CardTitle>Tiến trình học tập</CardTitle></div><Badge variant="secondary">Ổn định đi lên</Badge></CardHeader><CardContent><div className="line-chart" role="img" aria-label="Band overall tăng từ 6.0 tháng Tư lên 7.0 tháng Chín"><svg viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true"><polyline points={progressPoints} /></svg>{MONTHLY_PROGRESS.map((point) => <span key={point.month}>{point.month}</span>)}</div><p className="chart-summary">Bạn đã tăng 1.0 band trong sáu tháng gần đây, với nhịp cải thiện đều từ tháng Sáu.</p></CardContent></Card>
      </section>

      <section className="dashboard-grid">
        <Card><CardHeader><div><p className="eyebrow">Skill breakdown</p><CardTitle>Bức tranh kỹ năng</CardTitle></div><Button asChild variant="ghost" size="sm"><Link to="/assistant">Xem feedback <ChevronRight aria-hidden="true" /></Link></Button></CardHeader><CardContent className="skill-list">{SKILL_BREAKDOWN.map((item) => <div key={item.skill}><div><strong>{item.skill}</strong><span>Band {item.band.toFixed(1)}</span></div><Progress value={item.band * 10} aria-label={`${item.skill}: band ${item.band.toFixed(1)}`} /><p>{item.detail}</p></div>)}</CardContent></Card>
        <Card className="ai-card"><CardHeader><Bot aria-hidden="true" /><div><p className="eyebrow">AI Review</p><CardTitle>Chỉnh một câu, học một điều cụ thể.</CardTitle></div></CardHeader><CardContent><p>Feedback Writing mới nhất đã sẵn sàng: cách dùng từ của bạn tốt, nhưng các câu phức cần liên kết tự nhiên hơn.</p><Button asChild variant="secondary"><Link to="/assistant"><Sparkles aria-hidden="true" /> Mở AI Correction</Link></Button></CardContent></Card>
      </section>

      <section id="history" className="history-section" aria-labelledby="history-title"><div><p className="eyebrow">5 bài gần nhất</p><h2 id="history-title">Lịch sử làm bài</h2></div><div className="history-table" role="table" aria-label="Lịch sử năm bài làm gần nhất"><div role="row" className="history-table__header"><span role="columnheader">Bài thi</span><span role="columnheader">Hoàn thành</span><span role="columnheader">Overall</span></div>{RECENT_SUBMISSIONS.map((submission) => <div role="row" key={submission.id}><strong role="cell">{submission.examTitle}</strong><span role="cell">{submission.completedAt}</span><b role="cell">{submission.overallBand.toFixed(1)}</b></div>)}</div></section>
    </main>
  )
}
