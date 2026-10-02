# Auth navigation and full-screen authentication layout

- **Status:** implemented
- **Scope:** Make the shared navbar react to a transient client-side auth UI state and replace the authentication split layout with a full-screen animated background and glass form card.

## Acceptance criteria

- Guests see only Home, Dictionary, sign-in and sign-up; both sign-in and sign-up navbar buttons are hidden on `/login` and `/register`. Signed-in users see the complete navigation and their existing tier dropdown instead of guest actions.
- Desktop navigation links are centered in the header, with the logo and account actions on either side; compact screens retain the collapsible navigation.
- The account dropdown exposes sign-out, which resets the in-memory demo session and returns to `/home`.
- Form submission updates only memory-scoped UI state; no credential, token or password is persisted and no external authentication request is made.
- Successful demo sign-in/sign-up replaces the auth route with `/overview`, labeled “Tổng quát” in both navigation bars. The root URL sends guests to `/home` and signed-in learners to `/overview`.
- The auth card retains its native form, password-manager autocomplete semantics and safe non-submit controls.
- Mascot and education-themed decorative icons animate using transform/opacity and respect reduced-motion preferences.
