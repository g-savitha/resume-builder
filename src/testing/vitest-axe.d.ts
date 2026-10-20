// vitest-axe ships matchers for an older Vitest typing; declare its one matcher for the current one.
import 'vitest';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- must match Vitest's own Matchers<T = any> declaration to merge with it
  interface Matchers<T = any> {
    toHaveNoViolations(): void;
  }
}
