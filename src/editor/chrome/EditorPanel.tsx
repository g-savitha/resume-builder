import { useState } from 'react';
import type { SectionId } from '@/domain';
import { sectionDef } from '@/sections';
import { useSectionOrder } from '@/store';
import { useActiveResumeDocument } from '../content/useActiveDocument';
import { useEditorScope } from '../context';
import { NoSectionSelected, SectionEditor } from '../content/SectionEditor';
import { SectionsCard } from '../content/SectionsCard';
import { VariantsPanel } from '../variants/VariantsPanel';
import { Tabs } from './Tabs';

type TabId = 'content' | 'variants' | 'design';
const TABS = [
  { id: 'content', label: 'Content' },
  { id: 'variants', label: 'Variants' },
  { id: 'design', label: 'Design' },
] as const;

export function EditorPanel() {
  const [tab, setTab] = useState<TabId>('content');
  return (
    <aside className="editor" aria-label="Editor">
      <Tabs tabs={TABS} active={tab} onChange={setTab} label="Editor sections">
        <div className="ed-body">
          {tab === 'content' ? <ContentTab /> : tab === 'variants' ? <VariantsPanel /> : <DesignTab />}
        </div>
      </Tabs>
    </aside>
  );
}

function ContentTab() {
  const { resumeId } = useEditorScope();
  const order = useSectionOrder(resumeId);
  // Open the first multi-entry section (usually Experience): it is where most editing happens.
  const getDoc = useActiveResumeDocument();
  const [selected, setSelected] = useState<SectionId | null>(() => {
    const doc = getDoc();
    const firstMany = order.find((id) => {
      const section = doc?.sections[id];
      return section ? sectionDef(section.kind)?.cardinality === 'many' : false;
    });
    return firstMany ?? order[0] ?? null;
  });
  const current = selected && order.includes(selected) ? selected : null;
  return (
    <div className="panel-stack">
      <SectionsCard selected={current} onSelect={setSelected} />
      {current ? (
        <SectionEditor
          key={current}
          sectionId={current}
          onDeleted={() => {
            setSelected(null);
          }}
        />
      ) : (
        <NoSectionSelected />
      )}
    </div>
  );
}

function DesignTab() {
  return (
    <section className="card empty-card" aria-labelledby="design-h">
      <h2 id="design-h">Design</h2>
      <p>
        Themes, fonts, spacing, page size and icon styles arrive with the theme engine (milestones 3 and 5). Every theme
        will take its colors from the target company’s logo, with WCAG AA contrast enforced.
      </p>
    </section>
  );
}
