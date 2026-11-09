import { useId } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { notebookApi } from '@/features/vocabulary/api/notebookApi'
import { overviewApi, type ProgressStatistics } from '../api/overviewApi'
import { useStatisticsResource, type StatisticsResource } from '../hooks/useStatisticsResource'
import { StatisticsCard } from './StatisticsCard'
import { SkillCompletionChart } from './StatisticsCharts'
import { BandHistoryPanel } from './BandHistoryPanel'
import { DetailedStatisticsHero } from './DetailedStatisticsHero'
import { DetailedVocabularyMap } from './DetailedVocabularyMap'
import '../statistics.css'
import '../detailed-statistics.css'

export function OverviewDetailedStats() {
  const [params, setParams] = useSearchParams()
  const courseId = params.get('courseId') ?? ''
  const courseFilterId = useId()
  const allProgress = useStatisticsResource('detailed-progress-courses', (signal) => overviewApi.allProgress(signal))
  const courseProgress = useStatisticsResource(`detailed-progress:${courseId}`, (signal) => courseId ? overviewApi.progress(0, courseId, signal) : Promise.resolve(null))
  const selectedProgress = courseId ? courseProgress : allProgress
  const progress: StatisticsResource<ProgressStatistics> = {
    data: selectedProgress.data,
    error: selectedProgress.error,
    loading: selectedProgress.loading,
    reload: selectedProgress.reload,
  }
  const courses = allProgress.data?.courses ?? []
  const selectedCourse = courses.find((course) => course.courseId === courseId)
  const vocabulary = useStatisticsResource('detailed-vocabulary-map', (signal) => notebookApi.getVocabularyMap(undefined, signal))
  function filter(name: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('tab', 'detailed-stats')
      if (value) next.set(name, value); else next.delete(name)
      return next
    })
  }
  return <div className="statistics-dashboard detailed-statistics">
    <DetailedStatisticsHero />
    <div className="detailed-middle-grid">
      <StatisticsCard title="Tiến Độ 4 Kỹ Năng" subtitle={courseId ? 'Tỷ lệ hoàn thành bài học của khóa học đã chọn' : 'Tỷ lệ hoàn thành bài học của các khóa đã bắt đầu'} resource={progress} className="detailed-skill-card" controls={
        <div className="detailed-course-filter">
          <label htmlFor={courseFilterId}>Khóa học</label>
          <Select value={courseId || 'all'} onValueChange={(value) => filter('courseId', value === 'all' ? '' : value)}>
            <SelectTrigger id={courseFilterId}><SelectValue /></SelectTrigger>
            <SelectContent position="popper" collisionPadding={12} className="max-w-[calc(100vw-24px)] [&_[data-slot=select-item]]:min-h-11 [&_[data-slot=select-item]]:whitespace-normal [&_[data-slot=select-item]]:break-words">
              <SelectItem value="all">Tất cả khóa đã bắt đầu</SelectItem>
              {courseId && !selectedCourse && <SelectItem value={courseId}>Khóa học đã chọn</SelectItem>}
              {courses.map((course) => <SelectItem key={course.courseId} value={course.courseId}>{course.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {allProgress.loading && <p role="status">Đang tải danh sách khóa học…</p>}
          {courseId && allProgress.error && <div role="alert"><p>Không tải được danh sách khóa học: {allProgress.error}</p><Button variant="outline" onClick={allProgress.reload}>Tải lại danh sách</Button></div>}
        </div>
      }>
        {(data) => <><SkillCompletionChart skills={data.skills} />{data.totalCourses === 0 && <Button asChild variant="outline"><Link to="/learn">Khám phá khóa học <ArrowRight size={16} /></Link></Button>}</>}
      </StatisticsCard>
      <BandHistoryPanel />
    </div>
    <StatisticsCard title="Bản đồ từ vựng của bạn" resource={vocabulary} className="detailed-vocabulary">{(data) => <DetailedVocabularyMap data={data} />}</StatisticsCard>

  </div>
}
