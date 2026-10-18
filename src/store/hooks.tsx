import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  resolveView,
  type Command,
  type FieldValue,
  type ItemId,
  type NodeId,
  type ResumeDocument,
  type ResumeId,
  type ResumeView,
  type Section,
  type SectionId,
  type Variant,
  type VariantId,
} from '@/domain';
import { rawStore, type EditorState, type EditorStore, type SaveState } from './store';

const StoreContext = createContext<EditorStore | null>(null);

export function EditorStoreProvider({ store, children }: { readonly store: EditorStore; readonly children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function useEditorStore(): EditorStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('Editor hooks must be used inside <EditorStoreProvider>');
  return store;
}

function useEditor<T>(selector: (s: EditorState) => T): T {
  return useStore(rawStore(useEditorStore()), selector);
}

const activeDoc = (s: EditorState): ResumeDocument | undefined => (s.activeResume ? s.docs[s.activeResume] : undefined);

export interface VariantRef {
  readonly resumeId: ResumeId;
  readonly variantId: VariantId;
}

/** Synchronous. Structural commands should be followed by an announcement (see useAnnounce). */
export function useDispatch(): (resumeId: ResumeId, cmd: Command) => void {
  const store = useEditorStore();
  return store.dispatch;
}

export function useActiveResumeId(): ResumeId | null {
  return useEditor((s) => s.activeResume);
}

/** One field of one item in the active resume. Only this field's subscribers re-render when it changes. */
export function useItemField(itemId: ItemId, field: string): FieldValue {
  return useEditor((s) => activeDoc(s)?.items[itemId]?.data[field] ?? null);
}

export function useItemExists(itemId: ItemId): boolean {
  return useEditor((s) => Boolean(activeDoc(s)?.items[itemId]));
}

export function useSectionOrder(resumeId: ResumeId): readonly SectionId[] {
  return useEditor((s) => s.docs[resumeId]?.sectionOrder ?? EMPTY);
}

export function useSection(sectionId: SectionId): Section | undefined {
  return useEditor((s) => activeDoc(s)?.sections[sectionId]);
}

export function useVariantOrder(resumeId: ResumeId): readonly VariantId[] {
  return useEditor((s) => s.docs[resumeId]?.variantOrder ?? EMPTY);
}

export function useVariant(resumeId: ResumeId, variantId: VariantId): Variant | undefined {
  return useEditor((s) => s.docs[resumeId]?.variants[variantId]);
}

export function useActiveVariantId(resumeId: ResumeId): VariantId | null {
  return useEditor((s) => s.docs[resumeId]?.activeVariant ?? null);
}

export function useIsHidden(ref: VariantRef, node: NodeId): boolean {
  return useEditor((s) => s.docs[ref.resumeId]?.variants[ref.variantId]?.hidden.includes(node) ?? false);
}

/** Visibility-filtered read model; recomputed only when the document (rev) or variant changes. */
export function useVariantView(ref: VariantRef): ResumeView | null {
  const doc = useEditor((s) => s.docs[ref.resumeId]);
  return useMemo(() => (doc ? resolveView(doc, ref.variantId) : null), [doc, ref.variantId]);
}

export function useResumeName(resumeId: ResumeId): string {
  return useEditor((s) => s.docs[resumeId]?.name ?? '');
}

export function useResumeList(): readonly { readonly id: ResumeId; readonly name: string }[] {
  const docs = useEditor((s) => s.docs);
  return useMemo(() => Object.values(docs).map((d) => ({ id: d.id, name: d.name })), [docs]);
}

/** Polite live-region announcer shared by the whole editor. */
export function useAnnounce(): (msg: string) => void {
  const store = useEditorStore();
  return useCallback((msg: string) => {
    store.announce(msg);
  }, [store]);
}

export function useAnnouncement(): EditorState['announcement'] {
  return useEditor((s) => s.announcement);
}

export function useSaveState(): SaveState {
  return useEditor((s) => s.save);
}

export interface ActiveVariantSummary {
  readonly resumeId: ResumeId;
  readonly variantId: VariantId;
  readonly label: string;
}

/** The active resume + variant, or null before persistence has loaded. Re-renders only when these change. */
export function useActiveVariantSummary(): ActiveVariantSummary | null {
  const picked = useEditor(
    useShallow((s) => {
      const doc = activeDoc(s);
      const variant = doc?.variants[doc.activeVariant];
      return { resumeId: doc?.id, variantId: variant?.id, label: variant?.label };
    }),
  );
  const { resumeId, variantId, label } = picked;
  return useMemo(
    () => (resumeId && variantId && label !== undefined ? { resumeId, variantId, label } : null),
    [resumeId, variantId, label],
  );
}

/** Non-reactive read of the latest document, for event handlers (labels in announcements, etc.). */
export function useGetDocument(): (id: ResumeId) => ResumeDocument | undefined {
  const store = useEditorStore();
  return store.getDocument;
}

const EMPTY: readonly never[] = [];
