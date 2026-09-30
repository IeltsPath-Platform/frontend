# Native authentication forms

- Status: implemented
- Scope: Client-only sign-in and sign-up pages at `/login` and `/register`. This work does not introduce an authentication endpoint, OAuth integration, credential persistence, or a backend contract. A memory-only UI session changes Navbar presentation after native form submission.

## Phases

1. Create reusable native form, social-provider controls, and labeled input components.
2. Implement sign-in and sign-up routes with password-manager autocomplete semantics and FormData submission handling.
3. Apply the existing visual tokens responsively, with focus states and reduced-motion fallback.
4. Add SSR assertions for form semantics and verify lint, types, and production build.

## Acceptance

- Each page uses one real `<form>` with native submit behavior and FormData read at submit time.
- Email uses `type="email"`, `autocomplete="username"`, and `autocapitalize="none"`.
- Sign-in and sign-up password fields respectively use `current-password` and `new-password`.
- Password visibility and federated buttons never submit the form inadvertently.
- No secret, password persistence, or unverified authentication integration is introduced.

## Authentication UI adjustments

- Email/password fields and the native submit button precede the divider and Google sign-in on both routes. Apple sign-in is removed.
- Google uses the user-provided image at `src/assets/683d9a1a8150ee8b29bfd25d46804605.png`, displayed at 20px without altering the source asset.
- The sign-in page includes a non-submit “Quên mật khẩu?” trigger. Its accessible dialog explains that password recovery is currently unavailable and returns focus to the trigger when closed. It does not send a reset email or call an unconfirmed backend endpoint.
- The desktop mascot is centered horizontally in the left half of the auth shell and the ambient heading block is raised; existing mobile placement and particle behavior remain in place.

## Verification

- `node --experimental-strip-types --test tests/practice-tools.test.ts tests/pages-render.test.mjs` — 23 passing tests, including SSR checks for email/password autocomplete tokens, button types, toggle links, and FormData usage.
- `npm run lint`, `npm run typecheck`, and `npm run build` — passed. The existing Vite chunk-size advisory remains.
- Browser visual review could not run because no browser target is connected in this workspace.
