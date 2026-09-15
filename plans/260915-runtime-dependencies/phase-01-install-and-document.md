# Install and document dependencies

## Files

- Modify `package.json`
- Modify `package-lock.json`
- Modify `README.md`

## Steps

1. Install the five requested packages as runtime dependencies with npm.
2. Read their resolved direct-package versions from the lockfile.
3. Add the packages, exact versions, and short purposes to the README's runtime dependency table.
4. Remove only the now-inaccurate deferred dependency categories; retain notes that the libraries have not yet been adopted in source.

## Risk and rollback

The change is manifest-only. Removing the five direct dependency entries and restoring the prior lockfile/README reverts it.
