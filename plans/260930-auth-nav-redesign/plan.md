# Auth navigation and full-screen authentication layout

- **Status:** implemented
- **Scope:** Make the shared navbar react to a transient client-side auth UI state and replace the authentication split layout with a full-screen animated background and glass form card.

## Acceptance criteria

- Guests see only Home, Dictionary, sign-in and sign-up; signed-in users see the complete navigation and their existing tier dropdown instead of guest actions.
- Form submission updates only memory-scoped UI state; no credential, token or password is persisted and no external authentication request is made.
- The auth card retains its native form, password-manager autocomplete semantics and safe non-submit controls.
- Mascot and education-themed decorative icons animate using transform/opacity and respect reduced-motion preferences.
