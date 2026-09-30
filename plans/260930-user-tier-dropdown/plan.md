# Reusable user-tier dropdown

- Status: implemented
- Scope: A standalone, presentational React account widget for demonstrating Free and Premium study tiers. It does not add authentication, persistence, routing or a subscription/payment integration.

## Steps

1. Provide a controlled/uncontrolled `UserTierDropdown` API with a safe Free-tier default.
2. Isolate tier visuals and motion in a CSS Module using the existing design tokens with portable fallbacks.
3. Preserve native disclosure and button semantics, a keyboard-accessible toggle, visible tier text, focus styling and reduced-motion support.
4. Add SSR assertions and run the repository validation commands.
5. Place the standalone demo beside the Sign-in and Sign-up links in the shared navigation, with a compact mobile treatment.

## Acceptance

- The component has no Zustand, Router or application-store dependency and works with no props.
- `tier`, `points`, `userName` and `onToggleTier` can be supplied by a consuming application.
- Premium renders a conic halo, three orbiting sparkles and a breathing glow; Free renders an animated points value.
- The card explicitly identifies the active tier and provides a demo-only tier switch using a native button.
- Motion is disabled for users who request reduced motion.
- The shared navbar shows the learner-tier demo after the Sign-in and Sign-up links without crowding mobile navigation.

## Verification

- `node --experimental-strip-types --test tests/practice-tools.test.ts tests/pages-render.test.mjs` — 29 passing tests.
- `npm run lint`, `npm run typecheck`, and `npm run build` — passed. The pre-existing Vite JavaScript chunk-size advisory remains.
