import { learningApi } from '@/features/learning-path/api'
import { getPracticeHistory, searchReadingTests } from '../reading/readingPracticeApi'
import { historyTitleMap, historyTitleRequests } from '../lib/historyTitles'
import { HISTORY_PAGE_SIZE, listSubmissionHistory, type SubmissionHistoryItem } from './submissionHistoryApi'
import { courseRow, freeRow, knowledgeRow, practiceRow, type HistoryNames, type HistoryRow } from './submissionHistoryView'

/** One page of lines and whether there is a next one. */
export interface HistoryPage {
  rows: HistoryRow[]
  hasNext: boolean
}

const ignoreFailure = <T>(fallback: T) => () => fallback

/**
 * The names of the topics and courses a page mentions, one call each and only when the page mentions one. A lesson is not
 * opened for its title: opening a lesson counts as studying it. A name that cannot be read is left out, and the line then
 * shows a plain label.
 */
export async function resolveHistoryNames(items: readonly SubmissionHistoryItem[]): Promise<HistoryNames> {
  const [topics, courses] = await Promise.all([
    items.some((item) => item.topicId) ? learningApi.listTopics().catch(ignoreFailure([])) : Promise.resolve([]),
    items.some((item) => item.courseId) ? learningApi.listCourses().catch(ignoreFailure([])) : Promise.resolve([]),
  ])
  return {
    topics: new Map(topics.map((topic) => [topic.id, topic.title] as const)),
    courses: new Map(courses.map((course) => [course.id, course.title] as const)),
  }
}

/** What the learner submitted inside a course. */
export async function loadCourseHistory(page: number): Promise<HistoryPage> {
  const result = await listSubmissionHistory('COURSE', null, page)
  const names = await resolveHistoryNames(result.items)
  return { rows: result.items.map((item) => courseRow(item, names)), hasNext: result.hasNext }
}

/** Free practice Writing or Speaking of the practice bank. */
export async function loadFreeHistory(skill: 'WRITING' | 'SPEAKING', page: number): Promise<HistoryPage> {
  const result = await listSubmissionHistory('FREE', skill, page)
  return { rows: result.items.map(freeRow), hasNext: result.hasNext }
}

/** Free practice sets on one knowledge point, named by the service. */
export async function loadKnowledgeHistory(page: number): Promise<HistoryPage> {
  const result = await listSubmissionHistory('KNOWLEDGE', null, page)
  return { rows: result.items.map(knowledgeRow), hasNext: result.hasNext }
}

/** Free practice Listening or Reading: the submitted attempts Assessment lists, with the titles of their tests. */
export async function loadBankHistory(skill: 'LISTENING' | 'READING', page: number): Promise<HistoryPage> {
  const result = await getPracticeHistory(skill, page, HISTORY_PAGE_SIZE)
  const submitted = result.items.filter((item) => item.status === 'SUBMITTED')
  const responses = await Promise.all(historyTitleRequests(submitted).map(async (request) => ({
    scope: request.scope,
    items: (await searchReadingTests({ skill, scope: request.scope, only: request.only, page: 0, size: 50 }).catch(ignoreFailure({ items: [] }))).items,
  })))
  const titles = historyTitleMap(responses)
  return {
    rows: submitted.map((item) => practiceRow(item, titles)),
    hasNext: (result.page + 1) * result.size < result.totalElements,
  }
}
