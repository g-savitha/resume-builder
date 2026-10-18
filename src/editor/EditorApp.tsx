import { useEffect, useMemo } from 'react';
import { useActiveVariantSummary } from '@/store';
import { LiveRegion } from './a11y/LiveRegion';
import { EditorPanel } from './chrome/EditorPanel';
import { TopBar } from './chrome/TopBar';
import { EditorScopeContext, type EditorScope } from './context';
import { PreviewPane } from './preview/PreviewPane';
import './editor.css';

/** The builder route: top bar, editor panel on the left, preview on the right. */
export function EditorApp() {
  const active = useActiveVariantSummary();
  const scope = useMemo<EditorScope | null>(
    () => (active ? { resumeId: active.resumeId, variantId: active.variantId, variantLabel: active.label } : null),
    [active],
  );
  useEffect(() => {
    if (scope) document.title = `${scope.variantLabel} variant · Resume builder`;
  }, [scope]);
  if (!scope) {
    return (
      <div className="app-loading" role="status">
        Loading your resume…
      </div>
    );
  }
  return (
    <EditorScopeContext value={scope}>
      <div className="app">
        <TopBar />
        <main className="main">
          <EditorPanel />
          <PreviewPane />
        </main>
        <LiveRegion />
      </div>
    </EditorScopeContext>
  );
}
