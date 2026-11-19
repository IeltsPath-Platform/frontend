/** The parts of speech the vocabulary library knows. */
export const COURSE_PARTS_OF_SPEECH = ['NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PREPOSITION', 'CONJUNCTION', 'IDIOM', 'PHRASAL_VERB'] as const
export type CoursePartOfSpeech = (typeof COURSE_PARTS_OF_SPEECH)[number]
