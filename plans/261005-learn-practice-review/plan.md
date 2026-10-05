# FE Learn MVP: Practice + Review ladder + gates

## Scope
FE only, HTTP (`VITE_USE_MOCK_LEARNING=false`). Mirror BE contracts from fe-main-flow-guide + lesson-learning-v1.

## Deliverables
1. LearningApi: practice-sets/attempts/submissions, theory-check; mock stubs
2. PracticePage + LessonPage CTA when COMPLETED/REQUIRED
3. ReviewPage THEORY (theory+quickCheck+theory-check) → PRACTICE
4. TopicDetail: clear PRACTICE/REVIEW gates; no start CTA until AVAILABLE
5. Writing timeout≥60s, points≥3, refresh; Listening audio/transcript only if BE returns
6. After test pass ≥70%: reload topics; PREMIUM disabled+label

## Verify
typecheck, lint, build + agent-browser E2E on fresh practice path

## Status
**DONE** — typecheck/lint/build green; practice + theory-check wired; topic gates hide final-test CTA until AVAILABLE.
Report: `plans/reports/e2e-practice-261005/report.md`
