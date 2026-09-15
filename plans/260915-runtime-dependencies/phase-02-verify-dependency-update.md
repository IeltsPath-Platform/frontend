# Verify the dependency update

## Checks

1. Confirm all five packages are direct runtime dependencies and their lockfile records resolve correctly.
2. Run `npm ci` to prove a clean lockfile installation.
3. Run lint, TypeScript checks, and the production build.
4. Confirm the diff is limited to the package manifest, lockfile, and README.

## Risk and rollback

No public application contracts change. If a requested package conflicts with the current toolchain, stop and report the exact npm resolution error before widening scope.
