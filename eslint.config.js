import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import boundaries from './scripts/eslint/module-boundaries.js';
import disableReason from './scripts/eslint/disable-reason.js';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'docs', 'e2e/.artifacts'] },
  js.configs.recommended,
  {
    // See docs/checks.md. Every escape hatch says why; ts-expect-error descriptions come from ban-ts-comment.
    plugins: { 'disable-reason': disableReason },
    rules: { 'disable-reason/require-reason': 'error' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { project: ['./tsconfig.json', './tsconfig.node.json'], tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'error',
      // Normalized records are id-keyed maps by design; deleting a key from a fresh copy is the idiom.
      '@typescript-eslint/no-dynamic-delete': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y, boundaries },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      'boundaries/module-imports': 'error',
    },
  },
  {
    // Graft G1: contrast-safe colors are minted only by ensureContrast, palettes only by derivePalette.
    // A cast is the only way to forge one, so casting to these types is banned everywhere else.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/themes/color/ensureContrast.ts', 'src/themes/color/derivePalette.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            ':matches(TSAsExpression, TSTypeAssertion) > TSTypeReference > Identifier[name=/^(ContrastSafe|Surface|AccessiblePalette)$/]',
          message: 'Contrast-safe types are minted only by themes/color. Do not cast: get the value from ensureContrast() or derivePalette() (via @/themes).',
        },
      ],
    },
  },
  {
    // ensureContrast is private to themes/color: the rest of themes/ imports only its index.ts.
    files: ['src/themes/**/*.{ts,tsx}'],
    ignores: ['src/themes/color/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: '(^|/)color/.', message: 'Import themes/color through its index.ts (./color).' }] },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/testing/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // See docs/checks.md: e2e waits for a state, never for a fixed time.
    files: ['e2e/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message:
            "Fixed sleeps make e2e flaky. Wait for the end state instead: await expect(locator).toHaveAttribute(...) / toBeVisible() / toContainText(), or expect.poll(). State hooks (data-app-state, save-status data-state, data-drag-state, data-row-label) are listed in .cursor/skills/verify-resume-builder/features/README.md.",
        },
      ],
    },
  },
  {
    files: ['e2e/**/*.ts', '*.config.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
);
