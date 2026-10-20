// Local ESLint plugin: every eslint-disable directive states why, inline, so the reason is reviewed with it
// and a disable added just to get lint green stands out.
const DIRECTIVE = /^\s*eslint-disable(?:-next-line|-line)?(?:\s|$)/;

/** @type {import('eslint').Rule.RuleModule} */
const requireReason = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Require a `-- reason` on every eslint-disable directive.' },
    schema: [],
    messages: {
      missing: 'eslint-disable needs a reason: append ` -- <why the rule is wrong here>`, or fix the code so the rule passes.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (DIRECTIVE.test(comment.value) && !/\s--\s+\S/.test(comment.value)) {
            context.report({ loc: comment.loc ?? { line: 1, column: 0 }, messageId: 'missing' });
          }
        }
      },
    };
  },
};

export default { rules: { 'require-reason': requireReason } };
