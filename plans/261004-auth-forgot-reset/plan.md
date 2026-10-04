# FE Auth: forgot/reset + OAuth stub

## Context
- Stack: React + Vite + TS (`frontend/`)
- Hybrid auth already works (cookie refresh + Bearer memory)
- BE ready: `POST /auth/forgot-password`, `POST /auth/reset-password`
- BE not ready: OAuth login

## Scope
**In:** forgot/reset pages + routes, wire AuthForm link, authApi methods, OAuth stub behind `VITE_OAUTH_ENABLED`, GuestOnly on public auth routes  
**Out:** better-auth, learning, SMTP, 2FA, fake OAuth login tokens

## Plan
1. Extend `env` + `vite-env` with `VITE_OAUTH_ENABLED` (default false)
2. `authApi`: forgotPassword, resetPassword, startOAuth, handleOAuthCallback (stubs throw/disabled when flag off)
3. Pages: `ForgotPasswordPage`, `ResetPasswordPage` (token from `?token=` or paste)
4. Routes in App + enable AuthForm forgot Link
5. AuthPage social: call startOAuth when enabled else “Chưa hỗ trợ”; SocialButtons disabled when off
6. Verify: typecheck, lint, build

## Acceptance
- Forgot → API call with email; reset with token+newPassword
- Logged-in users blocked from login/register/forgot/reset via GuestOnly
- OAuth flag false: no crash, no fake token

## Status
**DONE** — typecheck/lint/build pass; code-review ACCEPT.
