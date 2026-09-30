import { classroomData } from './classroomData'
import type { LessonMaterialSection, LessonQuizQuestion, LessonWorkspaceData, VocabularyEntry } from '@/types/lesson'

export const LESSON_VOCABULARY: readonly VocabularyEntry[] = [
  { id: 'sustainable', word: 'sustainable', partOfSpeech: 'adjective', level: 'B2', phoneticUk: '/səˈsteɪ.nə.bəl/', phoneticUs: '/səˈsteɪ.nə.bəl/', meaning: 'able to continue over a period of time without causing damage', translation: 'bền vững · có thể duy trì lâu dài', tags: ['environment', 'nature'], example: 'Cities need sustainable ways to reduce pollution.' },
  { id: 'biodiversity', word: 'biodiversity', partOfSpeech: 'noun', level: 'C1', phoneticUk: '/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/', phoneticUs: '/ˌbaɪ.oʊ.daɪˈvɝː.sə.t̬i/', meaning: 'the variety of plant and animal life in a particular habitat', translation: 'đa dạng sinh học', tags: ['environment', 'academic'], example: 'The project protects biodiversity in coastal forests.' },
  { id: 'renewable', word: 'renewable', partOfSpeech: 'adjective', level: 'B2', phoneticUk: '/rɪˈnjuː.ə.bəl/', phoneticUs: '/rɪˈnuː.ə.bəl/', meaning: 'able to be replaced naturally and used again', translation: 'có thể tái tạo', tags: ['energy', 'environment'], example: 'Solar power is a renewable source of energy.' },
  { id: 'conserve', word: 'conserve', partOfSpeech: 'verb', level: 'B2', phoneticUk: '/kənˈsɜːv/', phoneticUs: '/kənˈsɝːv/', meaning: 'to protect something from harm or destruction', translation: 'bảo tồn · tiết kiệm', tags: ['environment', 'verb'], example: 'We should conserve water during the dry season.' },
  { id: 'ecosystem', word: 'ecosystem', partOfSpeech: 'noun', level: 'B2', phoneticUk: '/ˈiː.kəʊˌsɪs.təm/', phoneticUs: '/ˈiː.koʊˌsɪs.təm/', meaning: 'all living things and their environment in a particular area', translation: 'hệ sinh thái', tags: ['nature', 'academic'], example: 'Plastic waste can damage a marine ecosystem.' },
  { id: 'carbon-footprint', word: 'carbon footprint', partOfSpeech: 'noun phrase', level: 'C1', phoneticUk: '/ˌkɑː.bən ˈfʊt.prɪnt/', phoneticUs: '/ˌkɑːr.bən ˈfʊt.prɪnt/', meaning: 'the amount of carbon dioxide produced by a person or activity', translation: 'dấu chân carbon', tags: ['climate', 'academic'], example: 'Taking the train can lower your carbon footprint.' },
]

const LESSON_MATERIALS: readonly LessonMaterialSection[] = [
  { id: 'outcomes', title: 'Learning Outcomes', description: 'By the end of the lesson, students should be able to:', items: ['Describe environmental issues with accurate vocabulary.', 'Express ideas, opinions and concerns clearly.', 'Give a simple recommendation.', 'Produce connected sentences on a familiar topic.'] },
  { id: 'grammar', title: 'Grammar Corner', description: 'Review and use language patterns for the topic.', items: ['Present Simple — facts, habits and general truths.', 'There is / There are — describing places and environments.', 'Adjectives + Nouns — natural environment, green landscape.', 'Because / So — giving reasons and results.'] },
  { id: 'vocabulary', title: 'Vocabulary Core', description: 'Key words and chunks for IELTS Foundation.', items: ['sustainable · biodiversity · renewable', 'pollution · protect · climate change', 'recycle · reduce · preserve · wildlife', 'a beautiful scenery · natural resources'] },
  { id: 'collocations', title: 'Collocations', description: 'Useful phrases to make answers more natural.', items: ['protect the environment', 'reduce pollution', 'natural resources', 'renewable energy', 'avoid plastic waste', 'spread awareness'] },
  { id: 'language', title: 'Idioms / Natural Language', description: 'Natural phrases for a clear, personal response.', items: ['a breath of fresh air', 'It is a green city.', 'The countryside is a breath of fresh air.', 'I find it one of the most relaxing places to visit.'] },
]

const LESSON_QUIZ: readonly LessonQuizQuestion[] = [
  { id: 'question-1', audioLabel: 'Bài nghe số 01 · 00:21', prompt: 'Nghe hội thoại và chọn đáp án đúng.', choices: ['The forest is beautiful, so I often visit it.', 'The forest is beautiful, so I often visit.', 'The forest is beautiful, so I often visits it.', 'The forest is beautiful, so I often visit it.'], correctChoiceIndex: 0 },
  { id: 'question-2', audioLabel: 'Bài nghe số 02 · 00:18', prompt: 'Chọn câu dùng “There is / There are” đúng.', choices: ['There are a river near my house.', 'There is many trees in this park.', 'There is a clean river near my house.', 'There are a beautiful scenery here.'], correctChoiceIndex: 2 },
  { id: 'question-3', audioLabel: 'Bài nghe số 03 · 00:24', prompt: 'Chọn cụm từ tự nhiên nhất.', choices: ['protect environment', 'protect the environment', 'protect a environment', 'protecting environment'], correctChoiceIndex: 1 },
  { id: 'question-4', audioLabel: 'Bài nghe số 04 · 00:20', prompt: 'Chọn từ phù hợp để hoàn thành câu.', choices: ['Sustainable cities use energy carefully.', 'Sustain cities use energy carefully.', 'Sustainably cities use energy carefully.', 'Sustained cities use energy carefully.'], correctChoiceIndex: 0 },
  { id: 'question-5', audioLabel: 'Bài nghe số 05 · 00:17', prompt: 'Chọn câu có ý nghĩa rõ ràng nhất.', choices: ['We recycle because it reduce waste.', 'We recycle because it reducing waste.', 'We recycle because it reduces waste.', 'We recycle because it reduced waste.'], correctChoiceIndex: 2 },
]

function getTopic(title: string): string {
  return title.split(':').at(-1)?.trim() || title
}

export function getLessonWorkspaceData(lessonId?: string): LessonWorkspaceData {
  const session = classroomData.sessions.find(({ id }) => id === lessonId) ?? classroomData.sessions[1]!

  return {
    lessonId: session.id,
    sessionNumber: session.sessionNumber,
    level: session.courseLevel,
    title: session.title,
    topic: getTopic(session.title),
    materials: LESSON_MATERIALS,
    quizQuestions: LESSON_QUIZ,
    vocabulary: LESSON_VOCABULARY,
  }
}
