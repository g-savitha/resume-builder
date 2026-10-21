import css from './editor.css?raw';

/** The token blocks: rules whose selector is :root or the light theme / paper selector. */
const BLOCK = /([^{}]+)\{([^{}]*)\}/g;
const isTokenSelector = (sel: string) => /^\s*(:root(\[data-ui-theme='light'\])?\s*,?\s*(\.paper)?\s*)$/.test(sel.replace(/\/\*[\s\S]*?\*\//g, ''));
const COLOR = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i;

function rules() {
  return [...css.matchAll(BLOCK)].map((m) => ({ selector: (m[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '').trim(), body: m[2] ?? '' }));
}
const vars = (body: string) => [...body.matchAll(/(--ui-[a-z0-9-]+)\s*:/g)].map((m) => m[1]).sort();

describe('editor.css', () => {
  it('uses color literals only in the theme token blocks', () => {
    const offenders = rules()
      .filter((r) => !isTokenSelector(r.selector))
      .flatMap((r) => r.body.split(';').filter((decl) => COLOR.test(decl)).map((decl) => `${r.selector} { ${decl.trim()} }`));
    expect(offenders).toEqual([]);
  });

  it('defines the same --ui-* tokens for the dark and the light theme', () => {
    const dark = rules().filter((r) => r.selector === ':root').flatMap((r) => vars(r.body));
    const light = rules().find((r) => r.selector.includes("[data-ui-theme='light']"));
    expect(dark.length).toBeGreaterThan(20);
    expect(vars(light?.body ?? '')).toEqual(dark.sort());
  });
});
