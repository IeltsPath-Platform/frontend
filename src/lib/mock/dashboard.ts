import type { Submission } from "@/types/exam"

export const RECENT_SUBMISSIONS: Submission[] = [
  { id: "submission-1", examTitle: "Cambridge 19 — Test 1", completedAt: "18 Sep 2026", overallBand: 7, skills: { LISTENING: 7.5, READING: 8, WRITING: 6.5, SPEAKING: 6.5 } },
  { id: "submission-2", examTitle: "Reading speed drill", completedAt: "12 Sep 2026", overallBand: 7, skills: { LISTENING: 7, READING: 8, WRITING: 6.5, SPEAKING: 6.5 } },
  { id: "submission-3", examTitle: "Recent Actual — Listening", completedAt: "05 Sep 2026", overallBand: 6.5, skills: { LISTENING: 7, READING: 7, WRITING: 6, SPEAKING: 6 } },
  { id: "submission-4", examTitle: "Writing — Graphs & Opinion", completedAt: "29 Aug 2026", overallBand: 6.5, skills: { LISTENING: 7, READING: 7.5, WRITING: 6, SPEAKING: 6 } },
  { id: "submission-5", examTitle: "Speaking — Everyday life", completedAt: "22 Aug 2026", overallBand: 6, skills: { LISTENING: 6.5, READING: 7, WRITING: 6, SPEAKING: 5.5 } },
]

export const MONTHLY_PROGRESS = [
  { month: "Apr", band: 6 },
  { month: "May", band: 6.2 },
  { month: "Jun", band: 6.4 },
  { month: "Jul", band: 6.5 },
  { month: "Aug", band: 6.8 },
  { month: "Sep", band: 7 },
]

export const SKILL_BREAKDOWN = [
  { skill: "Listening", band: 7.5, detail: "Strong comprehension; sustain accuracy in Parts 3–4." },
  { skill: "Reading", band: 8, detail: "Excellent pace and evidence selection." },
  { skill: "Writing", band: 6.5, detail: "Develop clearer paragraph progression." },
  { skill: "Speaking", band: 6.5, detail: "Add more precise topic vocabulary." },
]
