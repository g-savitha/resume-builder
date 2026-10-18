/**
 * Moves focus to the first match after React has committed and the browser has laid out
 * (reordered rows are re-inserted, which can drop focus). Falls back through the selectors in order.
 */
export function focusSoon(...selectors: readonly string[]): void {
  requestAnimationFrame(() => {
    for (const selector of selectors) {
      const el = document.querySelector<HTMLElement>(selector);
      if (el && !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true') {
        el.focus();
        return;
      }
    }
  });
}

/** CSS attribute selector value escaping for ids we generate (uuids, kinds). */
export const attr = (value: string) => value.replace(/["\\]/g, '\\$&');
