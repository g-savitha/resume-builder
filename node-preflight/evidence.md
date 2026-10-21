# Node preflight — evidence
Commit: 109cce1 on chore/node-preflight (based on main 605de09)

## Before: Node v20.19.2, no .npmrc, `pnpm test`
exit 1
      1       Tests  23 passed (23)
      1      Errors  16 errors
      1  Test Files  3 passed (3)
     16 Caused by: TypeError: Cannot read properties of undefined (reading 'bind')
      1 ⎯⎯⎯⎯⎯⎯ Unhandled Errors ⎯⎯⎯⎯⎯⎯

## After: Node v20.19.2, `pnpm check`
exit 1 (immediately)
```
 ERR_PNPM_UNSUPPORTED_ENGINE  Unsupported environment (bad pnpm and/or Node.js version)

Your Node version is incompatible with "/workspace/rb-work".

Expected version: >=22
Got: v20.19.2

This is happening because the package's manifest has an engines.node field specified.
To fix this issue, install the required Node version.
```

## After: Node v22.23.3, `pnpm check`
 Test Files  19 passed (19)
      Tests  159 passed (159)
  Size:       104.69 kB gzipped
  Size:       3.23 kB gzipped
exit 0
