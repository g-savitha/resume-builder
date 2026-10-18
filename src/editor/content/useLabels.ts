import { useCallback } from 'react';
import type { ItemId, SectionId } from '@/domain';
import { itemTitle, sectionLabel } from '@/sections';
import { useActiveResumeDocument } from './useActiveDocument';

/** Label lookup for announcements; reads the latest document at call time. */
export function useSectionLabels(): (id: SectionId) => string {
  const getDoc = useActiveResumeDocument();
  return useCallback(
    (id: SectionId) => {
      const section = getDoc()?.sections[id];
      return section ? sectionLabel(section) : 'Section';
    },
    [getDoc],
  );
}

export function useItemLabels(sectionId: SectionId): (id: ItemId) => string {
  const getDoc = useActiveResumeDocument();
  return useCallback(
    (id: ItemId) => {
      const doc = getDoc();
      const section = doc?.sections[sectionId];
      const item = doc?.items[id];
      return section && item ? itemTitle(section, item, section.itemOrder.indexOf(id)) : 'Entry';
    },
    [getDoc, sectionId],
  );
}
