import type {
  Exam,
  ListeningSection,
  Passage,
  Question,
  SpeakingPrompt,
  WritingTask,
} from "@/types/exam"

const QUESTION_TYPES: Question["type"][] = [
  "MULTIPLE_CHOICE",
  "MATCHING_HEADINGS",
  "TRUE_FALSE_NOT_GIVEN",
  "FILL_IN_THE_BLANK",
]

function createQuestions(prefix: string, start: number, count: number): Question[] {
  return Array.from({ length: count }, (_, index) => {
    const number = start + index
    const type = QUESTION_TYPES[index % QUESTION_TYPES.length]

    return {
      id: `${prefix}-${number}`,
      number,
      type,
      prompt:
        type === "FILL_IN_THE_BLANK"
          ? `Complete the note for question ${number} with ONE WORD AND/OR A NUMBER.`
          : `Select the best answer for question ${number}.`,
      options:
        type === "FILL_IN_THE_BLANK"
          ? undefined
          : ["A. The main argument", "B. A supporting detail", "C. A contrasting view", "D. Not stated"],
      answer: type === "FILL_IN_THE_BLANK" ? "sample answer" : "A",
    }
  })
}

export const READING_PASSAGES: Passage[] = [
  {
    id: "urban-gardens",
    title: "Passage 1 — The quiet rise of urban gardens",
    content:
      "Across many cities, residents are converting overlooked corners into small gardens. These spaces do more than provide fresh produce: they give neighbours a reason to meet, help children observe seasonal change, and soften streets that once held only concrete. Researchers caution that a garden cannot solve every environmental problem, yet its value often lies in the habits it encourages. When people care for a shared plot, they are more likely to notice how water, shade and waste affect the wider neighbourhood.",
    questions: createQuestions("reading-1", 1, 13),
  },
  {
    id: "sleep-memory",
    title: "Passage 2 — What sleep does for memory",
    content:
      "Memory is not simply stored at the moment we learn something. During sleep, the brain revisits recently formed patterns and strengthens connections that are likely to be useful later. This does not mean that longer sleep automatically produces better recall. The regularity of a person's sleep schedule and the timing of study also matter. For language learners, a short review before a normal night's sleep can be more valuable than repeating the same material late into the night.",
    questions: createQuestions("reading-2", 14, 13),
  },
  {
    id: "coastal-design",
    title: "Passage 3 — Designing for a changing coast",
    content:
      "Coastal towns have traditionally relied on fixed barriers to keep out the sea. Today, planners are increasingly combining these structures with dunes, wetlands and open public spaces that can absorb water temporarily. The approach accepts that some change is inevitable and focuses on reducing harm rather than promising complete control. Its success depends on local knowledge: a solution that protects one shoreline may move pressure to another if it is designed without considering the whole coast.",
    questions: createQuestions("reading-3", 27, 14),
  },
]

export const LISTENING_SECTIONS: ListeningSection[] = [
  {
    id: "revision-note",
    title: "Part 1 — Revision note",
    audioLabel: "Mock audio track: 06:42",
    transcript:
      "You will hear a student discussing revisions to a hotel brochure with a designer. Listen carefully and complete the notes.",
    questions: createQuestions("listening-1", 1, 10),
  },
  {
    id: "campus-tour",
    title: "Part 2 — Campus tour",
    audioLabel: "Mock audio track: 07:10",
    transcript:
      "The speaker describes the facilities and weekly events available to new students on campus.",
    questions: createQuestions("listening-2", 11, 10),
  },
  {
    id: "research-seminar",
    title: "Part 3 — Research seminar",
    audioLabel: "Mock audio track: 08:25",
    transcript:
      "Two students prepare a presentation on the effects of public transport policy.",
    questions: createQuestions("listening-3", 21, 10),
  },
  {
    id: "marine-lecture",
    title: "Part 4 — Marine lecture",
    audioLabel: "Mock audio track: 09:05",
    transcript:
      "A lecturer explains how coral ecosystems recover after environmental stress.",
    questions: createQuestions("listening-4", 31, 10),
  },
]

export const WRITING_TASKS: WritingTask[] = [
  {
    id: "task-1-city-transport",
    title: "Writing Task 1",
    prompt:
      "The bar chart shows the percentage of journeys made by four forms of transport in a city in 2000 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    minimumWords: 150,
  },
  {
    id: "task-2-remote-work",
    title: "Writing Task 2",
    prompt:
      "Some people think remote work is beneficial for society, while others believe it has more negative effects. Discuss both views and give your own opinion.",
    minimumWords: 250,
  },
]

export const SPEAKING_PROMPTS: SpeakingPrompt[] = [
  {
    part: 1,
    topic: "Daily routines",
    prompts: ["What part of your day do you enjoy most?", "Do you prefer planning your day or being spontaneous?"],
  },
  {
    part: 2,
    topic: "Describe a place you learned something useful",
    prompts: ["You should say where it was, what you learned, who was with you, and explain why it was memorable."],
  },
  {
    part: 3,
    topic: "Learning beyond the classroom",
    prompts: ["How has technology changed independent learning?", "What should schools teach that is difficult to learn online?"],
  },
]

export const TEST_BANK: Exam[] = [
  {
    id: "cambridge-19-test-1",
    title: "Cambridge 19 — Test 1",
    collection: "Cambridge 19",
    description: "Full mock test with all four skills and original practice content.",
    skill: "FULL_TEST",
    durationMinutes: 165,
    questionCount: 40,
    attemptCount: 1248,
    averageBand: 6.8,
    level: "Band 6.5–7.5",
  },
  {
    id: "cambridge-18-reading-2",
    title: "Cambridge 18 — Reading Test 2",
    collection: "Cambridge 18",
    description: "Three academic reading passages with a balanced question mix.",
    skill: "READING",
    durationMinutes: 60,
    questionCount: 40,
    attemptCount: 892,
    averageBand: 7.1,
    level: "Band 7.0+",
  },
  {
    id: "actual-listening-september",
    title: "Recent Actual — Listening September",
    collection: "Recent Actual",
    description: "Four listening parts designed for concentration and note completion.",
    skill: "LISTENING",
    durationMinutes: 30,
    questionCount: 40,
    attemptCount: 610,
    averageBand: 6.5,
    level: "Band 6.0–7.0",
  },
  {
    id: "writing-graphs-opinion",
    title: "Writing — Graphs & Opinion",
    collection: "Skill builder",
    description: "A Task 1 report and Task 2 essay with AI feedback readiness.",
    skill: "WRITING",
    durationMinutes: 60,
    questionCount: 2,
    attemptCount: 472,
    averageBand: 6.4,
    level: "Band 6.5+",
  },
  {
    id: "speaking-everyday-life",
    title: "Speaking — Everyday life",
    collection: "Skill builder",
    description: "Part 1–3 prompts with self-recording practice structure.",
    skill: "SPEAKING",
    durationMinutes: 14,
    questionCount: 8,
    attemptCount: 386,
    averageBand: 6.7,
    level: "Band 6.0–7.0",
  },
]

export const FEATURED_READING_EXAM = TEST_BANK[0]
