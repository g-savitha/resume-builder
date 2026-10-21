import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Icon } from '@/icons';
import { ResumePreview } from '@/render';
import { useVariantView } from '@/store';
import { themeBaseFor } from '@/themes';
import { useEditorScope } from '../context';

/** Width of the stage's content box, tracked so the pages can be scaled down to fit (never up). */
function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);
  return [ref, width];
}

/** The live, paginated preview of the active variant: the same DOM the PDF will print. */
export function PreviewPane() {
  const { resumeId, variantId, variantLabel } = useEditorScope();
  const view = useVariantView({ resumeId, variantId });
  const [pages, setPages] = useState<number | null>(null);
  const onSettled = useCallback((n: number) => {
    setPages(n);
  }, []);
  const [fitRef, fitWidth] = useWidth<HTMLDivElement>();
  const themeLabel = view ? themeBaseFor(view.variant.themeBase).label : '';
  return (
    <section className="preview" aria-labelledby="preview-h">
      <div className="pv-bar">
        <h2 id="preview-h" className="pill">
          <Icon name="info" /> Preview
        </h2>
        <span className="pv-meta" data-testid="preview-meta">
          {variantLabel} · {themeLabel} theme
          {pages === null ? '' : ` · ${String(pages)} ${pages === 1 ? 'page' : 'pages'}`}
        </span>
      </div>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable regions must be keyboard-reachable (axe scrollable-region-focusable, WCAG 2.1.1) */}
      <div className="stage" tabIndex={0} role="region" aria-label="Preview, scrollable">
        <div className="stage-fit" ref={fitRef}>
          {view ? <ResumePreview view={view} onSettled={onSettled} fitWidth={fitWidth || undefined} /> : null}
        </div>
      </div>
    </section>
  );
}
