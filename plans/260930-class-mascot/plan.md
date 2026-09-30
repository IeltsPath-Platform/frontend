# Standalone class mascot

- Status: implemented
- Scope: A reusable animated classroom mascot component for Home and Classroom. The requested source component and PNG were absent from this workspace, so a newly generated replacement asset is explicitly used instead of claiming to have copied the original.

## Steps

1. Add a project-bound transparent triceratops asset at `src/assets/triceratops-class-mascot.png`.
2. Create `ClassMascot` with default asset, image override, size and class-name props.
3. Isolate the float, orbit and sparkle animation in a CSS Module with reduced-motion handling.
4. Replace Home and Classroom's previous hero mascots with the reusable component.
5. Add SSR assertions and validate lint, types and production build.

## Acceptance

- `ClassMascot` runs with no props and accepts `className`, `imageSrc` and `size` overrides.
- Its asset reserves the component's square dimensions, preventing layout shift.
- Decorative usage is hidden from assistive technology by default; meaningful usage may supply `imageAlt`.
- Float, orbit and twinkle animations use transform/opacity and stop under `prefers-reduced-motion`.

## Verification

- `node --experimental-strip-types --test tests/practice-tools.test.ts tests/pages-render.test.mjs` — 29 passing tests.
- `npm run lint`, `npm run typecheck`, and `npm run build` — passed. The processed PNG bundles at 514.57 kB; the pre-existing Vite JavaScript chunk-size advisory remains.
