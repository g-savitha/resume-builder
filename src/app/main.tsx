import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { ResumeDocument } from '@/domain';
import { applyBrand, EditorApp, EditorPortsContext, PreviewOnlyApp, type EditorPorts } from '@/editor';
import { createEditorStore, EditorStoreProvider } from '@/store';
import { createSeedDocument, SEEDED_COMPANIES } from './seed';
import { claimEditorLock, takeOverEditor } from './tabLock';

const store = createEditorStore();
const root = document.getElementById('root');
/** `/preview`: the preview-only route for phones (vercel.json rewrites every page path to index.html). */
const previewOnly = location.pathname.replace(/\/+$/, '') === '/preview';

// Storage (idb + valibot) is a lazy chunk: the shell paints first, then the saved resume loads.
const storage = import('@/storage');
const ports: EditorPorts = {
  parseDocument: async (raw) => (await storage).parseDocument(raw),
  takeOver: takeOverEditor,
};

if (root) {
  createRoot(root).render(
    <StrictMode>
      <EditorStoreProvider store={store}>
        <EditorPortsContext value={ports}>{previewOnly ? <PreviewOnlyApp /> : <EditorApp />}</EditorPortsContext>
      </EditorStoreProvider>
    </StrictMode>,
  );
  let seeded: ResumeDocument | undefined;
  let flush: (() => Promise<void>) | undefined;
  void claimEditorLock(store, () => void flush?.())
    .then(() => storage)
    .then(({ startPersistence }) => startPersistence({ store, createInitial: () => (seeded = createSeedDocument(Date.now())) }))
    .then((persistence) => {
      flush = () => persistence.flush();
      // First run only: the seeded company variants start on the placeholder palette, then get their logo
      // colors once the lookup returns (silently; nothing the user did needs announcing).
      if (!seeded) return;
      for (const variant of Object.values(seeded.variants)) {
        if (!SEEDED_COMPANIES.includes(variant.label)) continue;
        void applyBrand({ dispatch: store.dispatch }, seeded.id, variant.id, variant.label, { name: variant.label });
      }
    });
}
