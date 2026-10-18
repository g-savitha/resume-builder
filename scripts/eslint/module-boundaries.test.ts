// @vitest-environment node
import { RuleTester } from 'eslint';
import path from 'node:path';
import tseslint from 'typescript-eslint';
import plugin from './module-boundaries.js';

// RuleTester picks up Vitest's global describe/it (globals: true).

const src = (p: string) => path.resolve(import.meta.dirname, '../../src', p);
const tester = new RuleTester({ languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' } });
const rule = plugin.rules['module-imports'];

tester.run('module-imports', rule, {
  valid: [
    { filename: src('editor/EditorApp.tsx'), code: "import { useDispatch } from '@/store';" },
    { filename: src('sections/experience/section.ts'), code: "import { f } from '../kit';" },
    { filename: src('domain/model.ts'), code: "import type { IconName } from '@/icons';" },
    { filename: src('icons/registry.tsx'), code: "import { Mail } from 'lucide-react';" },
    { filename: src('domain/applyCommand.test.ts'), code: "import { buildDocument } from '@/testing';" },
  ],
  invalid: [
    { filename: src('editor/EditorApp.tsx'), code: "import { x } from '@/store/store';", errors: [{ messageId: 'deep' }] },
    { filename: src('editor/EditorApp.tsx'), code: "import { x } from '../store/store';", errors: [{ messageId: 'escape' }] },
    { filename: src('domain/model.ts'), code: "import { x } from '@/store';", errors: [{ messageId: 'arrow' }] },
    { filename: src('store/store.ts'), code: "import { x } from '@/store';", errors: [{ messageId: 'self' }] },
    { filename: src('editor/Icon.tsx'), code: "import { Mail } from 'lucide-react';", errors: [{ messageId: 'owned' }] },
    { filename: src('editor/x.ts'), code: "import { buildDocument } from '@/testing';", errors: [{ messageId: 'testingOutsideTests' }] },
    { filename: src('newmodule/index.ts'), code: "import { x } from '@/domain';", errors: [{ messageId: 'unknownModule' }] },
    { filename: src('editor/lazy.ts'), code: "const m = import('@/storage/persistence');", errors: [{ messageId: 'deep' }] },
  ],
});
