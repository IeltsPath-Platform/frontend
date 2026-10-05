# Home subscription plans and activation keys

- Status: UI complete; activation contract confirmation pending.
- Authorization: current user request supplies the V5 product baseline and requests real activation integration.
- Sources: `../../../../BE/backend/.sdd/database/DATABASE_V5.md`, backend access controllers/DTOs, existing Home and demo auth session.
- Scope: Home pricing, activation modal/API boundary, subscription status, focused tests and integration documentation. Preserve unrelated uncommitted navbar/auth work. No payment gateway, invented prices, backend edits, or fake activation success.

## Phases

1. [complete] Verify backend routes, payloads, authentication and current-access response fields; resolve any mismatch with the requested baseline before dependent implementation.
2. [complete] Replace illustrative plans with FREE, PREMIUM_30D (30 days / 4 human credits), PREMIUM_90D (90 days / 12 human credits), and separate POINT_50 / POINT_100 add-ons. Use existing UI primitives and tokens.
3. [complete] Implement key input, validation, pending/error/success handling and authoritative current-access display wherever the verified API supports it.
4. [complete] Review, run focused tests then lint/typecheck/build, and document integration limits.

## Acceptance

- PREMIUM_90D has the “Phổ biến nhất” badge. Premium includes content, human grading and advanced analytics, without granting AI points.
- Points do not expire and grant neither Premium access nor human grading credits.
- Premium and point cards open “Kích hoạt Gói / Nạp Key”; no checkout or illustrative prices remain.
- Requests and parsing match verified backend DTOs; activation codes are never persisted or logged.
- Current-plan information uses server data, never inferred from the demo tier or an invented expiry date.
- Loading, error, no-subscription and unavailable-backend states remain truthful and accessible.

## Risks and rollback

- Backend auth from `feat/ui-main-flow` is retained after the merge resolution. `HomePage` still accepts an optional authenticated `AccessClient`; the app route does not supply it, so activation remains disabled until that integration is completed. See the [merge record](../../docs/journals/2026-10-05-home-auth-merge.md).
- V5 and `SubscriptionResponse` expose the active `FREE`/`PREMIUM` plan, not the last `PREMIUM_30D`/`PREMIUM_90D` key product. The UI therefore shows one authoritative Premium status block instead of guessing a duration card after extensions.
- The requested `POST /api/access/keys/activate` + `{ code }` contract conflicts with the implemented backend controller, which exposes `POST /api/access/me/keys/activate` + `{ rawKey, idempotencyKey }`. The frontend retains the verified backend contract until the product owner confirms a coordinated API change.
- Roll back only this task's pricing/activation changes, preserving earlier work.
