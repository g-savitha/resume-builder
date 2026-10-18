import { useCallback } from 'react';
import type { ResumeDocument } from '@/domain';
import { useGetDocument } from '@/store';
import { useEditorScope } from '../context';

export function useActiveResumeDocument(): () => ResumeDocument | undefined {
  const get = useGetDocument();
  const { resumeId } = useEditorScope();
  return useCallback(() => get(resumeId), [get, resumeId]);
}
