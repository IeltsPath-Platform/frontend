# Course progress panel

- **Status:** implemented
- **Scope:** Extract the class course-progress summary into a portable React component with module-scoped styles.

## Acceptance criteria

- `CourseProgressPanel` accepts optional `course`, `stats`, `surface`, and `className` props and displays useful fallback data without the classroom mock.
- It uses project semantic tokens (`primary`, `card`, `muted`, `border`) and provides distinct light-card and dark-glass surfaces.
- The classroom page composes the new component instead of retaining the local course-panel markup and styles.
- Verification covers the portable component plus lint, strict type checking, build, and the available render tests.
