# Home and backend auth merge resolution

Date: 2026-10-05 (Asia/Saigon)

Merged `origin/feat/ui-main-flow` into local `feat/home-access-plans` with `--no-commit` to resolve the source branch conflicts. No commit or push was performed.

## Decisions

- Resolved all six conflicts: the obsolete demo auth navigation plan was deleted; App, navbar, auth session, auth page and render tests were reconciled.
- Retained the entire backend auth implementation from `feat/ui-main-flow`, including cookie refresh, memory-only bearer tokens, password recovery, provider and route guards. API contracts are unchanged.
- Retained the home layout, footer, legal routes and root redirect (guest → `/home`, signed in → `/overview`). Login keeps the incoming requested-route redirect with `/learn` as its default.
- Navbar keeps the home branding and account dropdown; logout now calls the backend and disables the dropdown action while pending. The `/learn` route tree remains protected and appears in signed-in navigation.
- Removed three incoming report `.env` files from the index only, preserving local copies; ignored `plans/reports/**/*.env`.

## Verification

- `node --test --test-concurrency=1 tests/*.test.mjs tests/*.test.ts`: 83 passed, including five new auth transport regression tests using isolated fetch mocks.
- `npm run lint`, `npm run typecheck`, `npm run build`: passed. Build retains a JavaScript chunk-size warning above 500 kB.
- No unresolved index entries or conflict markers in source/tests. Auth and shared HTTP implementation match `origin/feat/ui-main-flow`.
- Full merge whitespace checks flag inherited whitespace/CRLF in incoming files; those unrelated files were not reformatted.
- Browser smoke testing was unavailable because no browser was connected. Live backend login was not tested in this session.

## Remaining integration

The [home access plan](../../plans/261001-home-access-plans/plan.md) still requires an authenticated `AccessClient` supplied to `HomePage`. This merge does not enable key activation or change its verified endpoint/payload.
