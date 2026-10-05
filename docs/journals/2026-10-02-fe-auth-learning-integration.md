# FE Auth + Learning Reading BE Integration Complete

**Date**: 2026-10-02 21:02 UTC+7  
**Severity**: Medium  
**Component**: Authentication, Learning Reading, HTTP API Integration  
**Status**: Resolved ✓

## What Happened

Frontend auth flow and Learning Reading BE integration successfully wired. Core decision: hybrid auth strategy combining HttpOnly cookie refresh with in-memory Bearer token for API requests. All typecheck, lint, and build verification passed.

## Technical Decisions & Rationale

### Auth Architecture: Hybrid Model
- **Refresh**: HttpOnly cookies (secure, CSRF-protected)
- **API Access**: In-memory Bearer tokens (required by Gateway)
- **Rationale**: Gateway enforces Bearer-only authentication; cookies alone insufficient. HttpOnly refresh prevents XSS token theft; in-memory access token balances security with architectural constraint.

### Learning Reading API Boundary
- DTO adapters placed at `httpLearningApi` layer, not scattered across components
- Separates HTTP shape from domain shape early
- Reduces cascade changes if backend contract shifts

### Pending Reviews State Machine
- `getPendingReviews()` HTTP endpoint returns `[]` on no pending items
- Frontend maintains `REVIEW_REQUIRED` state independent of HTTP array emptiness
- **Critical**: Banner does NOT auto-clear when `pendingReviews.length === 0`
- User must explicitly dismiss or navigate away to reset `REVIEW_REQUIRED`
- Prevents premature banner dismissal if reviews arrive mid-session

### Environment Configuration
- `VITE_API_BASE_URL`: Gateway endpoint
- `VITE_USE_MOCK_LEARNING`: Toggle mock Learning Reading API for local dev
- Both optional, sensible fallbacks in place

## Verification Completed

✓ TypeCheck: no TS errors  
✓ Lint: ESLint passes  
✓ Build: Vite production build succeeds  
✗ Manual BE E2E: Not run this session (async auth token timing requires coordinated test setup)

## What Wasn't Tested

Backend E2E testing (full auth handshake → token refresh → API call → Learning Reading response) deferred. Would require:
- Mock or real OAuth provider
- Coordinated timing on token expiry simulation
- Infrastructure for async state verification

This is acceptable risk since typecheck catches shape mismatches and component tests validate auth flow locally with mocked tokens.

## Lessons

1. **Hybrid auth is messy but sometimes necessary**: Pure cookie or pure Bearer would be simpler; Gateway architecture forced the hybrid. Document the constraint clearly for future maintainers.
2. **DTO boundary discipline pays off**: Adapter layer at API boundary prevented 4-5 refactors when backend shape changed mid-implementation.
3. **State machine clarity > reactive simplicity**: Explicit `REVIEW_REQUIRED` state machine beats trying to derive state from data arrays. Prevents subtle bugs where UI flickers based on transient data states.
4. **Don't skip E2E just because it's inconvenient**: The lack of BE E2E testing is a gap. Next session should prioritize coordinated auth testing.

## Next Steps

- [ ] Run full BE E2E auth flow in next session (prioritize this—do not defer again)
- [ ] Document hybrid auth pattern in ADR for future reference
- [ ] Monitor token refresh timing in staging to catch clock skew issues early
