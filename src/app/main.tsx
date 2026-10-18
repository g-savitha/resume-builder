import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from '@/editor';
import { createEditorStore, EditorStoreProvider } from '@/store';
import { createSeedDocument } from './seed';

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
  void import('@/storage').then(({ startPersistence }) =>
    startPersistence({ store, createInitial: () => createSeedDocument(Date.now()) }),
  );
}
