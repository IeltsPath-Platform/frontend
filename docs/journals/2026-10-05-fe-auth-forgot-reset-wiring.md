# Frontend Auth: Forgot/Reset Password Wiring Complete

**Date**: 2026-10-05 00:27 UTC+7  
**Severity**: Low  
**Component**: Authentication (forgot password, reset password, OAuth)  
**Status**: Resolved  

## What Happened

Completed the forgot/reset password wiring for the frontend. The auth flow now has a fully functional password recovery path with proper backend integration, optional OAuth support gated behind `VITE_OAUTH_ENABLED`, and clean route separation for guest-only pages.

## Technical Details

### New Pages & Routes
- **ForgotPasswordPage** (`/forgot-password`) — entry point, triggers `authApi.forgotPassword(email)`
- **ResetPasswordPage** (`/reset-password`) — handles `token` query param, calls `authApi.resetPassword(token, password)`
- **OAuthCallbackPage** (`/auth/oauth/callback`) — OAuth redirect handler
- **AuthShell** — layout wrapper for guest-only auth flows

All routes are protected by `GuestOnly` guard; unauthenticated users only.

### API Integration
- `authApi.forgotPassword(email)` → sends email, receives reset token + expiry
- `authApi.resetPassword(token, password)` → verifies token, updates password
- No fake OAuth tokens; OAuth stubs are **disabled by default** and only active when `VITE_OAUTH_ENABLED=true`

### UI Updates
- `AuthForm` forgot password link is **enabled** (was disabled during stub phase)
- `SocialButtons` are **conditionally rendered** — only visible when `VITE_OAUTH_ENABLED=true`
- Hybrid auth flow (email + OAuth) remains unchanged; no token mixing

### Build Verification
```
typecheck: ✓ 0 errors
lint:      ✓ 0 errors
build:     ✓ 887ms (dist ready, one chunk-size warning for mascot image, acceptable)
```

## What Makes This Clean

1. **No fake tokens** — OAuth callback is a proper routing target, not a debug hack
2. **Feature gated** — OAuth can be toggled on/off without code changes, only env config
3. **Type safe** — all API calls typed via `authApi`, no any-casts
4. **Route clarity** — guest-only pages are isolated under `GuestOnly` guard, no auth-checking logic inline
5. **Backwards compatible** — existing hybrid auth unchanged, forgot/reset is additive

## Why This Matters

Password recovery is **foundational**. Users who lose access must have a clear, reliable path back in. The clean separation means:
- QA can test email recovery without OAuth complexity
- OAuth can be enabled/disabled in staging or production without touching code
- Future additions (2FA, passkeys) can plug into `AuthShell` without refactoring routes

## Lessons Learned

- **Gating features in env** beats conditional code paths. `VITE_OAUTH_ENABLED` is clearer than magic booleans.
- **Type-safe API clients** save debugging time. Every `authApi.*` call is contract-backed.
- **Layout wrappers** (AuthShell) scale better than route-level duplicated UI.

## Next Steps

1. ✅ **Done**: Wire forgot/reset to backend, add pages, enable routes
2. 🔄 **QA**: Test forgot password end-to-end (email flow, reset link, new password login)
3. 🔄 **QA**: Verify OAuth is off by default (no SocialButtons visible)
4. 🔄 **QA**: Toggle `VITE_OAUTH_ENABLED=true`, verify OAuth appears and works
5. 📋 **Future**: Add 2FA / additional recovery methods if needed

---

**Build Status**: ✓ Clean  
**Ready for**: QA / staging deployment
