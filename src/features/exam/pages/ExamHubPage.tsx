import { ArrowRight, Clock3, Headphones, PenLine, Search, UsersRound, Volume2 } from "lucide-react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TEST_BANK } from "@/lib/mock/exams"

const skillIcon = { FULL_TEST: Search, READING: Search, LISTENING: Headphones, WRITING: PenLine, SPEAKING: Volume2 }
const skillLabel = { FULL_TEST: "Full test", READING: "Reading", LISTENING: "Listening", WRITING: "Writing", SPEAKING: "Speaking" }

export function ExamHubPage() {
  return (
    <main className="page exam-hub" id="main-content" tabIndex={-1}>
      <section className="page-hero" aria-labelledby="exam-hub-title">
        <div>
          <p className="eyebrow">Kho đề được chọn lọc</p>
          <h1 id="exam-hub-title">Luyện đúng kỹ năng, tiến bộ có mục tiêu.</h1>
          <p>Chọn một bộ đề, mô phỏng áp lực thi thật và xem rõ phần nào cần đầu tư tiếp theo.</p>
        </div>
        <div className="page-hero__stat"><span>12</span><p>Bộ đề mới được thêm trong tháng này</p></div>
      </section>

      <section className="exam-filter" aria-label="Lọc bộ đề">
        <Tabs defaultValue="all">
          <TabsList aria-label="Lọc theo kỹ năng">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="reading">Reading</TabsTrigger>
            <TabsTrigger value="listening">Listening</TabsTrigger>
            <TabsTrigger value="writing">Writing</TabsTrigger>
            <TabsTrigger value="speaking">Speaking</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="filter-chips" aria-label="Lọc theo bộ đề">
          <Button variant="outline" size="sm">Cam 15–19</Button>
          <Button variant="outline" size="sm">Recent Actual</Button>
          <Button variant="outline" size="sm">Band 7.0+</Button>
        </div>
      </section>

      <section className="exam-grid" aria-label="Danh sách bộ đề">
        {TEST_BANK.map((exam) => {
          const Icon = skillIcon[exam.skill]
          return (
            <Card className="exam-card" key={exam.id}>
              <CardHeader>
                <div className="exam-card__topline"><Badge variant="secondary"><Icon aria-hidden="true" size={14} /> {skillLabel[exam.skill]}</Badge><span>{exam.collection}</span></div>
                <CardTitle>{exam.title}</CardTitle>
                <p>{exam.description}</p>
              </CardHeader>
              <CardContent>
                <dl className="exam-card__metrics">
                  <div><dt><Clock3 aria-hidden="true" /> Thời gian</dt><dd>{exam.durationMinutes} phút</dd></div>
                  <div><dt><Search aria-hidden="true" /> Câu hỏi</dt><dd>{exam.questionCount} câu</dd></div>
                  <div><dt><UsersRound aria-hidden="true" /> Lượt thi</dt><dd>{exam.attemptCount.toLocaleString("vi-VN")}</dd></div>
                </dl>
                <div className="exam-card__band"><span>Band trung bình</span><strong>{exam.averageBand.toFixed(1)}</strong><em>{exam.level}</em></div>
              </CardContent>
              <CardFooter>
                <Button asChild size="lg" className="w-full"><Link to={`/exams/${exam.id}/start`}>Vào thi ngay <ArrowRight aria-hidden="true" /></Link></Button>
              </CardFooter>
            </Card>
          )
        })}
      </section>
    </main>
  )
}
