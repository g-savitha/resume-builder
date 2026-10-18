import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import * as matchers from 'vitest-axe/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

expect.extend(matchers);
afterEach(() => {
  cleanup();
});
