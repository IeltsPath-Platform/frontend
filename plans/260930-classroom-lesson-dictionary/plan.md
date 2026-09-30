# Classroom lesson workspace and dictionary

- Status: implemented
- Scope: Lesson materials, lesson homework quiz, lesson vocabulary, and the standalone dictionary UI. These are client-side demonstration screens using repository mock data; no API, persistence, or backend contract is introduced.

## Phases

1. Define lesson workspace mock data and types for the available sessions and vocabulary entries.
2. Build a reusable lesson shell with the shared course header, resource/homework sidebar, and responsive content region.
3. Add materials, homework quiz, and lesson vocabulary views under `/lessons/:lessonId`.
4. Add the standalone `/vocabulary` dictionary screen using the same vocabulary data and visual system.
5. Verify routes, interactions, reduced-motion behavior, lint, typecheck, and production build.

## Verification

- `node --experimental-strip-types --test tests/practice-tools.test.ts tests/pages-render.test.mjs` — 20 passing tests.
- `npm run lint`, `npm run typecheck`, and `npm run build` — passed. The existing Vite chunk-size advisory remains.
- Browser visual review could not run because no browser target is connected in this workspace.

## Acceptance

- A classroom session opens a material page with grouped lesson resources matching the supplied desktop composition.
- The lesson homework quiz presents one answerable multiple-choice question at a time with previous/next controls and progress.
- Lesson vocabulary and the standalone dictionary provide searchable, accessible vocabulary cards.
- The existing full mock-exam workspace at `/practice/test/:testId` remains unchanged.
- Layout is responsive, preserves the existing design tokens, avoids horizontal overflow, and disables nonessential motion for `prefers-reduced-motion`.
