import { useEffect, useRef, useState } from 'react';
import { ResumePreview } from '@/render';
import { useActiveVariantSummary, useVariantView } from '@/store';
import { ExportPdfButton, VariantSelect } from './chrome/TopBar';
import { EditorScopeContext, type EditorScope } from './context';
import { LiveRegion } from './a11y/LiveRegion';
import { TabGuard } from './chrome/TabGuard';
import './editor.css';

/**
 * `/preview` (M7): the resume alone, scaled to the screen, for phones. Switch variant and export the PDF; editing
 * stays on the full builder ("Open the editor").
 */
export function PreviewOnlyApp() {
  const active = useActiveVariantSummary();
  const scope: EditorScope | null = active ? { resumeId: active.resumeId, variantId: active.variantId, variantLabel: active.label } : null;
  const label = active?.label;
  useEffect(() => {
    if (label !== undefined) document.title = `${label} variant preview · Resume builder`;
  }, [label]);
  if (!scope) {
    return (
      <div className="app-loading" role="status" data-app-state="loading">
        Loading your resume…
      </div>
    );
  }
  return (
    <EditorScopeContext value={scope}>
      <div className="pv-only" data-app-state="ready" data-route="preview">
        <header className="pv-only-bar">
          <h1>Resume preview</h1>
          <VariantSelect resumeId={scope.resumeId} activeId={scope.variantId} />
          <ExportPdfButton />
          <a className="btn btn-ghost btn-sm" href="/">
            Open the editor
          </a>
        </header>
        <main className="pv-only-stage">
          <FittedPreview scope={scope} />
        </main>
        <LiveRegion />
        <TabGuard />
      </div>
    </EditorScopeContext>
  );
}

function FittedPreview({ scope }: { readonly scope: EditorScope }) {
  const view = useVariantView({ resumeId: scope.resumeId, variantId: scope.variantId });
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);
  return <div ref={ref}>{view ? <ResumePreview view={view} fitWidth={width || undefined} /> : null}</div>;
}
