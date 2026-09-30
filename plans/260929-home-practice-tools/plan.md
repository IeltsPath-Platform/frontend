# Home and practice workspace

- Status: implemented (automated validation complete; browser visual verification unavailable)
- Scope: Home, shared navigation, responsive answers, mode-specific tools, selected-text actions, floating notes, refined Reading/Listening workspaces, and dedicated Writing/Speaking workspaces.
- Approval: user approved labeled demonstration content and required Radix dependencies.
- Preserve Overview/Classroom content and uncommitted work. No backend or checkout integration.

## Steps

1. Share primary navigation; add `/home`, retain other routes.
2. Build blue-token Home with hero, mentor details and pricing comparison.
3. Store exam/practice mode in URL; guard tools and actions.
4. Capture paragraph offsets and render highlights declaratively.
5. Add floating notes (drag, keyboard, minimize) and image-backed local flashcards.
6. Fix answer wrapping; run focused tests, lint, typecheck and build.
7. Re-layout the reading workspace around progress, question map, passage navigation and a responsive three-column grid; use native document scrolling with desktop sticky side panels.
8. Change Reading to a single-question answer panel, left-aligned progress fill, and left-column question navigation without changing Exam/Practice assistance rules.
9. Add a Listening workspace with a local, timed audio-player UI that synchronizes the active question map state.
10. Add a split Writing workspace with a zoomable task visual, live word counter and countdown timer.
11. Add a Speaking workspace with a browser-permission-based recorder, wave visualizer, speaking timer and local playback; do not introduce recording upload or backend contracts.
12. Refactor the shared Reading/Listening progress indicator to a native determinate `<progress>` element, keeping its visual percentage and ARIA value derived from one clamped calculation.
13. Replace the retired Home sidebar hero panel with a full-width, accessible animated hero focused on the daily Band-goal message.
14. Refine Reading and Practice workspace readability, scrollbars and interaction feedback; use directional slide-and-fade question changes while retaining document scrolling and sticky side panels.

## Acceptance

- Home link adjacent to Overview on desktop/mobile.
- Answers fit narrow screens without horizontal overflow.
- Exam exposes no passage-assistance tools or selection context menu. Practice includes Highlight, Note, dictionary and Flashcard.
- The workspace shows a progress bar, question map, passage navigation and answer panel; map, navigation and answer state stay synchronized.
- The workspace uses one native document scroll flow. On desktop, the Question Map and active-question panel remain sticky below the two top bars; no Parallax animation is applied.
- Reading and Listening render only the active question. The map, navigation buttons and answer state remain synchronized.
- Writing provides Task 1 visual zoom, live word count and countdown. Speaking safely handles microphone unavailability/permission denial and does not claim Mentor upload.
- Selection context menu is positioned at pointer and blocks the native menu in passage only.
- Notes retain drafts while hidden, stay on-screen and have non-drag movement controls.
- Flashcards validate images and handle storage errors without claiming server sync.
- Browser runtime currently reports no available browser; visual verification pending.
- The shared progress indicator uses a styled native `<progress>` rail/value pair with real-time `aria-valuenow`; its value, assistive text, and visible percentage remain synchronized.
- Home no longer renders the `YOUR IELTS SPACE` panel. Its full-width hero uses transform/opacity-only decoration, a visible headline entrance and a reduced-motion fallback.
- Reading and Practice controls, answer options and Question Map states give clear 200ms interaction feedback. Question changes use a direction-aware slide/fade animation with a reduced-motion fallback.
