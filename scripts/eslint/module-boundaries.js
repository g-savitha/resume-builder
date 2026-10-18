// Local ESLint plugin: every folder under src/ is a module importable only via
// its index.ts as `@/<module>`, and only along the arrows in ARCHITECTURE.
import fs from 'node:fs';
import path from 'node:path';
import { ARCHITECTURE, OWNED_PACKAGES } from './architecture.js';

const SRC = path.resolve(import.meta.dirname, '../../src');

function moduleOf(file) {
  const rel = path.relative(SRC, file);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const [first] = rel.split(path.sep);
  return first && rel.includes(path.sep) ? first : null;
}

const isTestFile = (file) => /\.test\.tsx?$/.test(file);

/** @type {import('eslint').Rule.RuleModule} */
const moduleImports = {
  meta: {
    type: 'problem',
    docs: { description: 'Import other src/ modules only via `@/<module>` and only along declared arrows.' },
    schema: [],
    messages: {
      deep: "Deep import '{{source}}'. Import '@/{{target}}' (its index.ts) instead.",
      self: "'{{source}}' imports this module through its own public entry. Use a relative import inside '{{mod}}'.",
      escape: "Relative import '{{source}}' leaves module '{{mod}}'. Import '@/{{target}}' instead.",
      arrow: "Module '{{mod}}' may not import '@/{{target}}'. Allowed: {{allowed}}. Change scripts/eslint/architecture.js only if docs/design/module-map.md changes.",
      unknownModule: "Folder 'src/{{mod}}' is not declared in scripts/eslint/architecture.js. Add it with its allowed imports.",
      missingIndex: "Module 'src/{{target}}' has no index.ts, so it has no public surface.",
      owned: "Only module '{{owner}}' may import '{{source}}'.",
      testingOutsideTests: "'@/testing' is for *.test.ts(x) files only.",
    },
  },
  create(context) {
    const file = context.filename;
    const mod = moduleOf(file);
    if (!mod) return {};
    const allowed = ARCHITECTURE[mod];
    let reportedUnknown = false;

    function check(node, source) {
      if (allowed === undefined) {
        if (!reportedUnknown) context.report({ node, messageId: 'unknownModule', data: { mod } });
        reportedUnknown = true;
        return;
      }
      const owner = Object.entries(OWNED_PACKAGES).find(([pkg]) => source === pkg || source.startsWith(`${pkg}/`));
      if (owner && owner[1] !== mod) {
        context.report({ node, messageId: 'owned', data: { owner: owner[1], source } });
        return;
      }
      if (source.startsWith('@/')) {
        const parts = source.slice(2).split('/');
        const target = parts[0] ?? '';
        if (parts.length > 1) return context.report({ node, messageId: 'deep', data: { source, target } });
        if (target === mod) return context.report({ node, messageId: 'self', data: { source, mod } });
        if (target === 'testing') {
          if (!isTestFile(file)) context.report({ node, messageId: 'testingOutsideTests' });
          return;
        }
        if (!fs.existsSync(path.join(SRC, target, 'index.ts'))) {
          return context.report({ node, messageId: 'missingIndex', data: { target } });
        }
        if (!allowed.includes(target)) {
          const list = allowed.length ? allowed.map((a) => `@/${a}`).join(', ') : '(none)';
          context.report({ node, messageId: 'arrow', data: { mod, target, allowed: list } });
        }
        return;
      }
      if (source.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), source);
        const targetMod = moduleOf(path.join(resolved, 'x'));
        if (targetMod !== mod) {
          context.report({ node, messageId: 'escape', data: { source, mod, target: targetMod ?? '?' } });
        }
      }
    }

    return {
      ImportDeclaration: (node) => check(node, String(node.source.value)),
      ExportNamedDeclaration: (node) => node.source && check(node, String(node.source.value)),
      ExportAllDeclaration: (node) => check(node, String(node.source.value)),
      ImportExpression: (node) => {
        if (node.source.type === 'Literal' && typeof node.source.value === 'string') check(node, node.source.value);
      },
    };
  },
};

export default { rules: { 'module-imports': moduleImports } };
