import { useDeferredValue } from 'react';
import type { DateRange, Inline, Item, RichText, Section } from '@/domain';
import { Icon } from '@/icons';
import { CONTACT_ICON, projectItem, sectionLabel } from '@/sections';
import { useVariantView } from '@/store';
import { useEditorScope } from '../context';

/**
 * Milestone 1 placeholder for the preview. It echoes the visible content of the active variant, unstyled,
 * so edits, reorders and hide/show can be seen flowing. The themed, paginated preview (the PDF DOM) is milestone 3.
 */
export function PreviewPane() {
  const { resumeId, variantId, variantLabel } = useEditorScope();
  const view = useDeferredValue(useVariantView({ resumeId, variantId }));
  return (
    <section className="preview" aria-labelledby="preview-h">
      <div className="pv-bar">
        <h2 id="preview-h" className="pill">
          <Icon name="info" /> Preview placeholder
        </h2>
        <span>Unstyled content echo of the {variantLabel} variant. The themed, paginated preview arrives in milestone 3.</span>
      </div>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable regions must be keyboard-reachable (axe scrollable-region-focusable, WCAG 2.1.1) */}
      <div className="stage" tabIndex={0} role="region" aria-label="Preview, scrollable">
        <article className="echo" aria-label="Content echo (read-only)" data-testid="content-echo">
          {view?.sections.map(({ section, items }) => <EchoSection key={section.id} section={section} items={items} />)}
          {view?.sections.length === 0 ? <p className="echo-empty">Everything is hidden in this variant.</p> : null}
        </article>
      </div>
    </section>
  );
}

function EchoSection({ section, items }: { readonly section: Section; readonly items: readonly Item[] }) {
  const projected = items.map((item) => ({ item, p: projectItem(section, item) }));
  const isIdentity = projected.some(({ p }) => p?.shape === 'identity');
  return (
    <section className="echo-section" data-testid={`echo-${section.kind}`}>
      {isIdentity ? null : <h3>{sectionLabel(section)}</h3>}
      {projected.map(({ item, p }) => {
        if (!p) return null;
        switch (p.shape) {
          case 'identity':
            return (
              <header key={item.id} className="echo-identity">
                <p className="echo-name">{p.content.name || 'Your name'}</p>
                {p.content.headline ? <p className="echo-headline">{p.content.headline}</p> : null}
                <ul className="echo-contacts">
                  {p.content.contacts.map((c, i) => (
                    <li key={`${c.kind}-${String(i)}`}>
                      <Icon name={CONTACT_ICON[c.kind]} /> {c.text}
                    </li>
                  ))}
                </ul>
              </header>
            );
          case 'prose':
            return <Rich key={item.id} value={p.content} />;
          case 'entries':
            return (
              <div key={item.id} className="echo-entry">
                <p className="echo-entry-head">
                  <strong>{p.content.title || 'Untitled'}</strong>
                  {p.content.subtitle ? <span> · {p.content.subtitle}</span> : null}
                  {p.content.place ? <span> · {p.content.place}</span> : null}
                  {p.content.dates ? <span className="echo-dates">{formatRange(p.content.dates)}</span> : null}
                </p>
                <Rich value={p.content.body} />
                {p.content.tags.length ? <p className="echo-tags">{p.content.tags.join(' · ')}</p> : null}
              </div>
            );
          case 'tags':
            return (
              <p key={item.id} className="echo-tag-group">
                {p.content.label ? <strong>{p.content.label}: </strong> : null}
                {p.content.tags.map((t) => t.name).join(', ')}
              </p>
            );
          default: {
            const _exhaustive: never = p;
            return _exhaustive;
          }
        }
      })}
    </section>
  );
}

function Rich({ value }: { readonly value: RichText }) {
  return (
    <>
      {value.map((block, i) =>
        block.t === 'p' ? (
          <p key={i}>
            <InlineView xs={block.children} />
          </p>
        ) : (
          <ul key={i}>
            {block.items.map((item, j) => (
              <li key={j}>
                <InlineView xs={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}

/** Marks render as strong/em; links render as underlined text (the echo is not navigable). */
function InlineView({ xs }: { readonly xs: readonly Inline[] }) {
  return (
    <>
      {xs.map((x, i) => {
        if (x.t === 'link') {
          return (
            <span key={i} className="echo-link">
              {x.children.map((c) => c.text).join('')}
            </span>
          );
        }
        const marks = x.marks ?? [];
        if (marks.includes('bold')) return <strong key={i}>{x.text}</strong>;
        if (marks.includes('italic')) return <em key={i}>{x.text}</em>;
        return x.text;
      })}
    </>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(d: string): string {
  const [y, m] = d.split('-');
  const month = m ? MONTHS[Number(m) - 1] : undefined;
  return month ? `${month} ${y ?? ''}` : (y ?? '');
}
function formatRange(r: DateRange): string {
  const start = r.start ? formatDate(r.start) : '';
  const end = r.end === 'present' ? 'Present' : r.end ? formatDate(r.end) : '';
  return [start, end].filter(Boolean).join(' – ');
}
