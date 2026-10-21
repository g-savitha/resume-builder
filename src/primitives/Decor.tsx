import type { ReactNode } from 'react';

/**
 * Purely visual content: hidden from assistive tech and inert, so nothing inside can take focus or be clicked.
 * Chromium tags aria-hidden content as an artifact in the PDF (to be confirmed by the tagged-PDF spike).
 */
export function Decor({ children }: { readonly children: ReactNode }) {
  return (
    <span aria-hidden="true" inert data-decor="">
      {children}
    </span>
  );
}
