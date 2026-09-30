# Original class progress panel extraction

- **Status:** implemented
- **Scope:** Package the supplied original `cls-panel` JSX, styles, icons and defaults into a reusable component.

## Acceptance criteria

- JSX hierarchy, original `cls-*` class names, layout metrics and hover behavior match the supplied reference.
- Only the old palette is mapped to semantic workspace tokens: `primary`, `accent`, `card`, `card-foreground`, `muted-foreground`, and `border`.
- Fallback course/stat data remains embedded in the component and callers can override it through props.
- The existing classroom hero uses the dark color surface only; its layout is unchanged.
