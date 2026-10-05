---
phase: 4
title: Verify typecheck lint build
status: completed
priority: P1
effort: S
dependencies:
  - 1
  - 2
  - 3
---

# Phase 4: Verify typecheck lint build

## Overview

Chạy cổng kiểm tra tự động và checklist tay theo yêu cầu cook.

## Requirements

- `npm run typecheck`, `lint`, `build` pass.
- Manual: register → login → me → /learn → topics → lesson → (review) → test-assignment → attempt → logout.

## Implementation Steps

1. `npm install` nếu chưa.
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`
5. Manual checklist với BE up (ghi kết quả trong report cook).
6. Spawn code-reviewer + tester theo cook gates.

## Success Criteria

- [x] typecheck pass
- [x] lint pass
- [x] build pass
- [ ] Manual happy-path documented (pass/blocked lý do) — deferred: BE E2E chưa chạy trong session

## Risk Assessment

- BE down → manual partial; automated still required.
- Node engines `>=24` — xác nhận Node version local.
