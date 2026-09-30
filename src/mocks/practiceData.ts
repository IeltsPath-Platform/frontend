import type {
  PracticeCard,
  PracticeNote,
  HeadingItem,
  ParagraphQuestion,
  ListeningQuestion,
  SpeakingCue,
  WritingTaskPrompt,
} from '@/types/practice'

export const MOCK_PRACTICE_CARDS: PracticeCard[] = [
  {
    id: 'student-services-enquiry',
    title: 'Student services enquiry',
    passageBadge: 'Section 1',
    tag: 'MIỄN PHÍ',
    skill: 'listening',
    imageUrl:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
    bulletPoints: ['Note Completion', '5 câu hỏi theo audio'],
    questionsCount: 5,
    partsCount: 1,
    attemptsCount: 3240,
    votesCount: 19,
    isCompleted: false,
    source: 'cambridge-10-20',
  },
  {
    id: 'transport-trends',
    title: 'Transport trends in a European city',
    passageBadge: 'Task 1',
    tag: 'MIỄN PHÍ',
    skill: 'writing',
    imageUrl:
      'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=600&q=80',
    bulletPoints: ['Academic Writing', 'Biểu đồ cột', '150 từ trở lên'],
    partsCount: 1,
    attemptsCount: 1860,
    votesCount: 17,
    isCompleted: false,
    source: 'ielts-space-pro',
  },
  {
    id: 'favourite-place',
    title: 'Describe a place you enjoy visiting',
    passageBadge: 'Part 2',
    tag: 'MIỄN PHÍ',
    skill: 'speaking',
    imageUrl:
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=600&q=80',
    bulletPoints: ['Cue card', 'Ghi âm trên trình duyệt', 'Nghe lại'],
    partsCount: 1,
    attemptsCount: 2540,
    votesCount: 21,
    isCompleted: false,
    source: 'actual-tests',
  },
  {
    id: 'vitamins-supplement',
    title: 'Vitamins - To supplement or not?',
    passageBadge: 'Passage 1',
    tag: 'MIỄN PHÍ',
    skill: 'reading',
    readingType: 'passage-1',
    imageUrl:
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
    bulletPoints: ['Gap Filling', 'Match Information', 'Yes/No/Not Given'],
    questionsCount: 13,
    partsCount: 1,
    attemptsCount: 13745,
    votesCount: 31,
    isCompleted: false,
    source: 'cambridge-10-20',
  },
  {
    id: 'crocodile-mystery',
    title: 'The Evolutionary Mystery: Crocodile...',
    passageBadge: 'Passage 1',
    tag: 'MIỄN PHÍ',
    skill: 'reading',
    readingType: 'passage-1',
    imageUrl:
      'https://images.unsplash.com/photo-1557053503-0c252e5c8093?auto=format&fit=crop&w=600&q=80',
    bulletPoints: ['Gap Filling', 'Matching Features'],
    questionsCount: 13,
    partsCount: 1,
    attemptsCount: 7126,
    votesCount: 24,
    isCompleted: false,
    source: 'actual-tests',
  },
  {
    id: 'development-plastics',
    title: 'The Development Of Plastics',
    passageBadge: 'Passage 2',
    tag: 'MIỄN PHÍ',
    skill: 'reading',
    readingType: 'passage-2',
    imageUrl:
      'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
    bulletPoints: ['Multiple Choice ( One Answer)', 'Gap Filling'],
    questionsCount: 13,
    partsCount: 1,
    attemptsCount: 2038,
    votesCount: 15,
    isCompleted: true,
    source: 'ielts-space-pro',
  },
  {
    id: 'sports-influence-1',
    title: 'How Does Watching Sports Influenc...',
    passageBadge: 'Passage 3',
    tag: 'PRO',
    skill: 'reading',
    readingType: 'passage-3',
    imageUrl:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
    bulletPoints: ['Summary Completion', 'Multiple Choice'],
    questionsCount: 13,
    partsCount: 1,
    attemptsCount: 14399,
    votesCount: 31,
    isCompleted: false,
    source: 'cambridge-10-20',
  },
  {
    id: 'sports-influence-2',
    title: 'How Does Watching Sports Influenc...',
    passageBadge: 'Passage 3',
    tag: 'PRO',
    skill: 'reading',
    readingType: 'passage-3',
    imageUrl:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
    bulletPoints: ['True/False/Not Given', 'Diagram Labeling'],
    questionsCount: 13,
    partsCount: 1,
    attemptsCount: 9820,
    votesCount: 18,
    isCompleted: false,
    source: 'ielts-space-pro',
  },
  {
    id: 'sports-influence-3',
    title: 'How Does Watching Sports Influenc...',
    passageBadge: 'Passage 3',
    tag: 'PRO',
    skill: 'reading',
    readingType: 'passage-3',
    imageUrl:
      'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80',
    bulletPoints: ['Sentence Completion', 'Matching Headings'],
    questionsCount: 14,
    partsCount: 1,
    attemptsCount: 8412,
    votesCount: 22,
    isCompleted: false,
    source: 'ielts-space-pro',
  },
]

export const MOCK_HEADINGS: HeadingItem[] = [
  { id: 'h1', roman: 'i.', title: 'Considering ecological costs' },
  { id: 'h2', roman: 'ii.', title: 'Modifications to the design of the snow gun' },
  { id: 'h3', roman: 'iii.', title: 'The need for different varieties of snow' },
  { id: 'h4', roman: 'iv.', title: 'Local concern over environmental issues' },
  { id: 'h5', roman: 'v.', title: 'A problem and a solution' },
  { id: 'h6', roman: 'vi.', title: 'Applications beyond the ski slopes' },
  { id: 'h7', roman: 'vii.', title: 'Converting wet snow to dry snow' },
  { id: 'h8', roman: 'viii.', title: 'New method for calculating modifications' },
  { id: 'h9', roman: 'ix.', title: 'Artificial process, natural product' },
  { id: 'h10', roman: 'x.', title: 'Snow formation in nature' },
]

export const MOCK_QUESTIONS: ParagraphQuestion[] = [
  { questionNumber: 1, paragraphLetter: 'C', correctHeadingRoman: 'iii.' },
  { questionNumber: 2, paragraphLetter: 'D', correctHeadingRoman: 'vi.' },
  { questionNumber: 3, paragraphLetter: 'E', correctHeadingRoman: 'i.' },
  { questionNumber: 4, paragraphLetter: 'F', correctHeadingRoman: 'ii.' },
  { questionNumber: 5, paragraphLetter: 'G', correctHeadingRoman: 'v.' },
]

export const MOCK_LISTENING_DURATION_SECONDS = 186

export const MOCK_LISTENING_QUESTIONS: ListeningQuestion[] = [
  { questionNumber: 1, cueStartSeconds: 0, cueEndSeconds: 35, prompt: 'Complete the note: The visitor is looking for a course that starts in ______.', helperText: 'Write ONE word and/or a number.', placeholder: 'Nhập đáp án cho câu 1' },
  { questionNumber: 2, cueStartSeconds: 36, cueEndSeconds: 74, prompt: 'What does the speaker say about the library card?', helperText: 'Write ONE word and/or a number.', placeholder: 'Nhập đáp án cho câu 2' },
  { questionNumber: 3, cueStartSeconds: 75, cueEndSeconds: 112, prompt: 'The workshop will be held in room ______.', helperText: 'Write ONE word and/or a number.', placeholder: 'Nhập đáp án cho câu 3' },
  { questionNumber: 4, cueStartSeconds: 113, cueEndSeconds: 150, prompt: 'Which item should students bring on the first day?', helperText: 'Write ONE word and/or a number.', placeholder: 'Nhập đáp án cho câu 4' },
  { questionNumber: 5, cueStartSeconds: 151, cueEndSeconds: 186, prompt: 'The tutor is available every ______ afternoon.', helperText: 'Write ONE word and/or a number.', placeholder: 'Nhập đáp án cho câu 5' },
]

export const MOCK_WRITING_TASK: WritingTaskPrompt = {
  title: 'Writing Task 1 · Academic',
  instruction: 'The chart below shows the percentage of people using different forms of transport in a European city between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  minimumWords: 150,
  timeLimitSeconds: 20 * 60,
}

export const MOCK_SPEAKING_CUE: SpeakingCue = {
  part: 'Speaking Part 2',
  title: 'Describe a place you enjoy visiting.',
  preparationSeconds: 60,
  speakingSeconds: 120,
  prompts: [
    'You should say where it is',
    'how often you go there',
    'what you do there',
    'and explain why you enjoy visiting this place',
  ],
}

export const MOCK_INITIAL_NOTES: PracticeNote[] = [
  {
    id: 'note-1',
    testId: 'snow-makers',
    title: 'Theories on the origin and evolution...',
    paragraphLabel: 'Paragraph 1',
    selectedText:
      'These days such machines are standard equipment in the vast majority of ski resorts around the world, making it possible for many resorts to stay open for months or more a year.',
    noteText:
      'Limited progress has been made because there are many strange theories and the topic was even banned in 1866.',
    createdAt: '18:42',
    color: '#3b82f6',
  },
  {
    id: 'note-2',
    testId: 'snow-makers',
    title: 'fossil evidence',
    paragraphLabel: 'Paragraph 3',
    selectedText:
      'Snow formed by natural weather systems comes from water vapour in the atmosphere.',
    noteText:
      'Limited progress has been made because there are many strange theories and the topic was even banned in 1866.',
    createdAt: '18:30',
    color: '#3b82f6',
  },
]

export const MOCK_PASSAGE_CONTENT = {
  title: 'Snow Makers',
  paragraphs: [
    {
      letter: 'A',
      text: 'In the early to mid twentieth century, with the growing popularity of skiing, ski slopes became extremely profitable businesses. But ski resort owners were completely dependent on the weather: if it didn"t snow, or didn"t snow enough, they had to close everything down. Fortunately, a device called the snow gun can now provide snow whenever it is needed. These days such machines are standard equipment in the vast majority of ski resorts around the world, making it possible for many resorts to stay open for months or more a year.',
    },
    {
      letter: 'B',
      text: 'Snow formed by natural weather systems comes from water vapour in the atmosphere. The water vapour condenses into droplets, forming clouds. If the temperature is sufficiently low, the water droplets freeze into tiny ice crystals. More water particles then condense onto the crystal and join with it to form a snowflake. As the snow flake grows heavier, it falls towards the Earth.',
    },
    {
      letter: 'C',
      text: 'The snow gun works very differently from a natural weather system, but it accomplishes exactly the same thing. The device basically works by combining water and air. Two different hoses are attached to the gun; one feeding from a water pumping station which pumps water to slopes, and the other feeding from an air compressor.',
    },
    {
      letter: 'D',
      text: 'While ski resorts are the primary consumers, artificial snow now serves a variety of other industries. Film crews use artificial snow machines for winter movie sets shot during hot summers. In agriculture, delicate fruit trees are sometimes coated in artificial snow blankets to shield tender buds from extreme wind chills.',
    },
    {
      letter: 'E',
      text: 'Despite its practical benefits, artificial snow production places massive demands on local water and energy supplies. A typical ski resort may consume millions of gallons of water in a single week to blanket its slopes. Environmental groups continue to raise concerns over depleted water tables and carbon footprints related to diesel-powered generators.',
    },
  ],
}
