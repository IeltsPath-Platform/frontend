import { createContext } from 'react'

export interface Fact {
  count: number
  unit: string
}

/** Blocks tell their section what they hold, so the section header can say "5 mục" or "19 từ". */
export const SectionContext = createContext<{ title: string; report: (id: string, fact: Fact | null) => void }>({
  title: '',
  report: () => {},
})
