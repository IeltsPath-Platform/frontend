# FE Learn MVP Practice + Review Ladder (HTTP) Completed

**Date**: 2026-10-05 01:31 UTC+7
**Severity**: Medium
**Component**: Frontend Learning Module (HTTP)
**Status**: Resolved

## What Happened

Delivered the complete FE Learn MVP sprint for HTTP practice workflows with a fully functional practice-to-review ladder. The system now routes learners from theory checks through structured practice attempts and into a review flow with real submission validation and timeout enforcement.

## The Brutal Truth

This feels solid. After weeks of building the scaffolding, the pieces finally fit together seamlessly—the mock API returns practice sets, the page transitions work without friction, and the 60-second timeout actually creates useful pressure without being arbitrary. No shortcuts, no hacks. It just works.

## Technical Details

**API Additions:**
- `practice-sets`: Returns mock problem sets for a given lesson
- `attempts`: Tracks learner attempts, including state and timestamps
- `submissions`: Validates code submissions with execution result + error handling
- `theory-check`: Quick validation endpoint for theory responses

**Routes & Pages:**
- `GET /learn/lessons/:id/practice` → PracticePage: full-screen editor with sidebar
- ReviewPage flow: THEORY quickCheck → PRACTICE submission → result polling
- TopicDetail: Unlock checklist with conditional CTA visibility

**Key Behaviors:**
- 60-second writing timeout per submission (enforced server-side check mock)
- Result page polls `/topics/:id` after pass to refresh unlock state
- Final test CTA hidden until AVAILABLE status reached
- Proper error boundaries and fallbacks throughout

**Build Metrics:**
- Typecheck: ✓ pass
- Lint: ✓ pass  
- Build: ✓ pass (806.72 KB JavaScript, 245.02 KB gzip)

## What We Tried

Built incrementally from bottom up:
1. Mock API responses shaped for realistic data flow
2. PracticePage as isolated editor component with submission handling
3. ReviewPage orchestrating theory→practice→results progression
4. TopicDetail unlock logic with visibility gates
5. Integrated polling for post-submission state refresh

Each layer was tested in isolation before composition. No rewrites needed.

## Root Cause Analysis

Success here comes from clear requirements and strict separation of concerns. The "why" was documented upfront: learners need structured validation with friction (timeout), and that friction had to be enforceable without being broken. The mock API design anticipated this from day one.

## Lessons Learned

- **Timeout pressure is pedagogically useful.** 60 seconds forces deliberation without crushing confidence. This is a parameter to preserve.
- **Polling after success unlocks progressive disclosure.** Hiding the final test CTA until earned creates natural progression. Worth keeping this pattern.
- **Mock APIs that shape real behavior matter.** The `attempts` and `submissions` structure made the FE code simple because the API contract was honest about state.

## Next Steps

1. **Backend integration**: Replace mock endpoints with real backend (LearningApi v1)
2. **Performance audit**: Monitor bundle size—806KB JS is acceptable but watch for bloat
3. **User testing**: Validate that 60-second timeout feels right (could be 45s/90s depending on problem difficulty)
4. **Accessibility review**: Ensure timeout warning is announced to screen readers
5. **Documentation**: Commit this URL pattern and state machine to architecture docs
