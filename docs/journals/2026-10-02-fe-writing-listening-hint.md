# 2026-10-02 — FE Writing / Listening / Hint polish

## Context
Auth + Reading HTTP already shipped. This pass filled remaining learner MVP gaps on FE only.

## Changes
- **Writing:** `EssayBlock`, `submitEssay` / `getWritingSubmission`, points via `GET /api/access/me/points`, errors `INSUFFICIENT_POINTS` / `GRADING_UNAVAILABLE`
- **Listening:** `AudioBlock` (native `<audio>`), review + topic-test audio; transcript only when BE sends it
- **Hints:** map + show `hint` on wrong answers in `QuestionField`
- **Post-test:** `TopicTestResultPage` always `listTopics()` to derive next topic (no fake `nextTopicId`)

## Verify
typecheck / lint / build PASS. Manual Docker E2E still pending.
