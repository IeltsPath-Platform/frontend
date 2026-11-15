import { useSearchParams } from 'react-router-dom'
import { SiteNavbar } from '@/components/SiteNavbar'
import { LearnTrail } from '@/features/learning-path/components/LearnTrail'
import { HISTORY_LABEL, HISTORY_PATH } from '@/features/learning-path/lib/resultOrigin'
import { ExaminerReviewsList } from '../writing/ExaminerReviewsList'
import { HistoryPane } from './HistoryPane'
import { loadBankHistory, loadCourseHistory, loadFreeHistory, loadKnowledgeHistory } from './historyLoaders'
import './submission-history.css'


export type HistoryTab = 'course' | 'practice' | 'knowledge' | 'teacher'
export type PracticeSkillKey = 'listening' | 'reading' | 'writing' | 'speaking'

const TABS: ReadonlyArray<{ key: HistoryTab; label: string }> = [
  { key: 'course', label: 'Trong khóa học' },
  { key: 'practice', label: 'Luyện tập 4 kỹ năng' },
  { key: 'knowledge', label: 'Luyện theo kiến thức' },
  { key: 'teacher', label: 'Bài giáo viên đã chấm' },
]
const SKILLS: ReadonlyArray<{ key: PracticeSkillKey; label: string }> = [
  { key: 'listening', label: 'Listening' },
  { key: 'reading', label: 'Reading' },
  { key: 'writing', label: 'Writing' },
  { key: 'speaking', label: 'Speaking' },
]

const isTab = (value: string | null): value is HistoryTab => TABS.some((tab) => tab.key === value)
const isSkill = (value: string | null): value is PracticeSkillKey => SKILLS.some((skill) => skill.key === value)

/** Loads the practice bank list of a skill: Listening and Reading from Assessment, Writing and Speaking from Learning. */
function loadPractice(skill: PracticeSkillKey, page: number) {
  if (skill === 'listening') return loadBankHistory('LISTENING', page)
  if (skill === 'reading') return loadBankHistory('READING', page)
  return loadFreeHistory(skill === 'writing' ? 'WRITING' : 'SPEAKING', page)
}

function PracticeHistory({ skill, onSkill }: { skill: PracticeSkillKey; onSkill: (skill: PracticeSkillKey) => void }) {
  const label = SKILLS.find((item) => item.key === skill)?.label ?? ''
  return (
    <>
      <div className="sh-skills" role="group" aria-label="Chọn kỹ năng">
        {SKILLS.map((item) => (
          <button aria-pressed={skill === item.key} className="sh-skill" key={item.key} onClick={() => onSkill(item.key)} type="button">{item.label}</button>
        ))}
      </div>
      <HistoryPane
        key={skill}
        paneKey={`practice:${skill}`}
        label={`Bài ${label} đã nộp`}
        load={(page) => loadPractice(skill, page)}
        empty={{
          title: `Bạn chưa nộp bài ${label} nào`,
          description: `Các bài ${label} bạn làm trong mục Luyện tập 4 kỹ năng sẽ hiện ở đây.`,
          actionLabel: `Đến danh mục ${label}`,
          to: `/practice-tests?skill=${skill}`,
        }}
      />
    </>
  )
}

/**
 * What the learner submitted: inside a course, in free practice of the four skills, and the essays a teacher graded. The tab and
 * the skill live in the address (`?tab=` and `?skill=`), so a line's result page returns to the list the learner left.
 * {@code defaultTab} is the tab shown when the address names none; the old address of the teacher list opens its own tab.
 */
export function SubmissionHistoryPage({ defaultTab = 'course' }: { defaultTab?: HistoryTab }) {
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const skillParam = params.get('skill')
  const tab = isTab(tabParam) ? tabParam : defaultTab
  const skill = isSkill(skillParam) ? skillParam : 'reading'

  const open = (next: HistoryTab) => setParams(next === defaultTab ? {} : { tab: next }, { replace: true })
  const openSkill = (next: PracticeSkillKey) => setParams({ tab: 'practice', skill: next }, { replace: true })

  return (
    <div className="wr-page wl-page lp-root">
      <SiteNavbar activePath={HISTORY_PATH} />
      <main className="wr-main wl-main">
        <LearnTrail items={[{ label: HISTORY_LABEL }]} />
        <h1 className="wl-title">Lịch sử nộp bài</h1>
        <div className="sh-tabs" role="tablist" aria-label="Loại bài đã nộp">
          {TABS.map((item) => (
            <button
              aria-controls="sh-panel" aria-selected={tab === item.key} className="sh-tab" id={`sh-tab-${item.key}`} key={item.key}
              onClick={() => open(item.key)} role="tab" type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div aria-labelledby={`sh-tab-${tab}`} id="sh-panel" role="tabpanel">
          {tab === 'course' && (
            <HistoryPane
              key="course"
              paneKey="course"
              label="Bài đã nộp trong khóa học"
              load={loadCourseHistory}
              empty={{
                title: 'Bạn chưa nộp bài nào trong khóa học',
                description: 'Practice, bài viết, bài nói và bài thi bạn làm trong khóa học sẽ hiện ở đây.',
                actionLabel: 'Đến khóa học của tôi',
                to: '/learn',
              }}
            />
          )}
          {tab === 'practice' && <PracticeHistory onSkill={openSkill} skill={skill} />}
          {tab === 'knowledge' && (
            <HistoryPane
              key="knowledge"
              paneKey="knowledge"
              label="Các lần luyện theo điểm kiến thức"
              load={loadKnowledgeHistory}
              empty={{
                title: 'Bạn chưa luyện điểm kiến thức nào',
                description: 'Các bộ luyện bạn mở bằng nút “Luyện tập” ở kết quả bài viết hoặc cây kiến thức sẽ được lưu ở đây.',
                actionLabel: 'Đến khóa học của tôi',
                to: '/learn',
              }}
            />
          )}
          {tab === 'teacher' && <ExaminerReviewsList />}
        </div>
      </main>
    </div>
  )
}
