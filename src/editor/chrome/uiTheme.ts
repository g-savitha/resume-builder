import { useCallback, useSyncExternalStore } from 'react';

/** The builder UI theme (never the resume's). Dark unless the user picked light; the choice is remembered. */
export type UiTheme = 'dark' | 'light';
export const UI_THEME_KEY = 'resume-builder:ui-theme';

const root = () => document.documentElement;
const read = (): UiTheme => (root().dataset.uiTheme === 'light' ? 'light' : 'dark');

/** Applies a theme: `<html data-ui-theme>` (the CSS hook, and the state agents wait on) plus localStorage. */
export function applyUiTheme(theme: UiTheme) {
  root().dataset.uiTheme = theme;
  try {
    localStorage.setItem(UI_THEME_KEY, theme);
  } catch {
    // Private mode or storage disabled: the theme still applies for this page.
  }
}

/** index.html sets the attribute before paint; this keeps React in sync with it. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(root(), { attributes: true, attributeFilter: ['data-ui-theme'] });
  return () => {
    observer.disconnect();
  };
}

export function useUiTheme(): readonly [UiTheme, () => void] {
  const theme = useSyncExternalStore(subscribe, read, () => 'dark' as const);
  const toggle = useCallback(() => {
    applyUiTheme(read() === 'dark' ? 'light' : 'dark');
  }, []);
  return [theme, toggle];
}
