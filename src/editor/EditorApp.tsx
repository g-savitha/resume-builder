import { useEffect, useMemo } from 'react';
import { useActiveVariantSummary, useTabState } from '@/store';
import { LiveRegion } from './a11y/LiveRegion';
import { EditorPanel } from './chrome/EditorPanel';
import { TabGuard } from './chrome/TabGuard';
import { TopBar } from './chrome/TopBar';
import { EditorScopeContext, type EditorScope } from './context';
import { PreviewPane } from './preview/PreviewPane';
import './editor.css';

/**
 * The builder route: top bar, editor panel on the left, preview on the right.
 * `data-app-state` (loading | ready) tells agents and tests when the saved resume has loaded.
 */
export function EditorApp() {
  const active = useActiveVariantSummary();
  const tab = useTabState();
  const scope = useMemo<EditorScope | null>(
    () => (active ? { resumeId: active.resumeId, variantId: active.variantId, variantLabel: active.label } : null),
    [active],
  );
  useEffect(() => {
    if (scope) document.title = `${scope.variantLabel} variant · Resume builder`;
  }, [scope]);
  if (!scope) {
    return (
      <div className="app-loading" role="status" data-app-state="loading">
        Loading your resume…
      </div>
    );
  }
  return (
    <EditorScopeContext value={scope}>
      <div className="app" data-app-state="ready">
        <div className="app-body" inert={tab === 'elsewhere'}>
          <TopBar />
          <main className="main">
            <EditorPanel />
            <PreviewPane />
          </main>
        </div>
        <LiveRegion />
        <TabGuard />
      </div>
    </EditorScopeContext>
  );
}
