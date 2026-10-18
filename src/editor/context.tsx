import { createContext, useContext } from 'react';
import type { ResumeId, VariantId } from '@/domain';

export interface EditorScope {
  readonly resumeId: ResumeId;
  /** The variant whose hide/show state the editor edits (the active one). */
  readonly variantId: VariantId;
  readonly variantLabel: string;
}

export const EditorScopeContext = createContext<EditorScope | null>(null);

export function useEditorScope(): EditorScope {
  const scope = useContext(EditorScopeContext);
  if (!scope) throw new Error('useEditorScope must be used inside <EditorScopeContext>');
  return scope;
}
