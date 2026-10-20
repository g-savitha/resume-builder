// @vitest-environment node
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import plugin from './disable-reason.js';

// Not testable here: a bare `/* eslint-disable */` turns this rule off too (see docs/checks.md).

const tester = new RuleTester({ languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' } });

tester.run('require-reason', plugin.rules['require-reason'], {
  valid: [
    { code: '// eslint-disable-next-line no-console -- CLI output\nconsole.log(1);' },
    { code: '/* eslint-disable no-console -- a script that prints */' },
    { code: '// eslint-enable no-console' },
    { code: '// mentions eslint-disable in prose' },
  ],
  invalid: [
    { code: '// eslint-disable-next-line no-console\nconsole.log(1);', errors: [{ messageId: 'missing' }] },
    { code: 'const a = 1; // eslint-disable-line no-unused-vars', errors: [{ messageId: 'missing' }] },
    { code: '/* eslint-disable no-console */\nconsole.log(1);', errors: [{ messageId: 'missing' }] },
  ],
});
