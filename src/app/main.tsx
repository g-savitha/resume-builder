import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { ResumeDocument } from '@/domain';
import { applyBrand, EditorApp } from '@/editor';
import { createEditorStore, EditorStoreProvider } from '@/store';
import { createSeedDocument, SEEDED_COMPANIES } from './seed';

const store = createEditorStore();
const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <EditorStoreProvider store={store}>
        <EditorApp />
      </EditorStoreProvider>
    </StrictMode>,
  );
  // Storage (idb + valibot) is a lazy chunk: the shell paints first, then the saved resume loads.
  let seeded: ResumeDocument | undefined;
  void import('@/storage')
    .then(({ startPersistence }) => startPersistence({ store, createInitial: () => (seeded = createSeedDocument(Date.now())) }))
    .then(() => {
      // First run only: the seeded company variants start on the placeholder palette, then get their logo
      // colors once the lookup returns (silently; nothing the user did needs announcing).
      if (!seeded) return;
      for (const variant of Object.values(seeded.variants)) {
        if (!SEEDED_COMPANIES.includes(variant.label)) continue;
        void applyBrand({ dispatch: store.dispatch }, seeded.id, variant.id, variant.label, { name: variant.label });
      }
    });
}
