import { memo, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { ResumeView } from '@/domain';
import { contentBox, pageSize, type LayoutInput, type PageBox, type PagedLayout, type PageSize } from '@/engine';
import { ALL_ATOMS, BlockView, OnSurface, type AtomRange } from '@/primitives';
import { resolveTheme, type ResolvedTheme } from '@/themes';
import { buildFlow, type RenderBlock } from './flow';
import { measureBlock } from './measureDom';
import { PreviewEngine } from './PreviewEngine';
import styles from './preview.module.css';

const PX_PER_PT = 96 / 72;
/** Space between page sheets on screen, in CSS px. */
const PAGE_GAP = 24;
const CONTINUED_FRAME: AtomRange = { from: 0, to: 0, continued: true };

export type PaginationState = 'measuring' | 'settled';

export interface ResumePreviewProps {
  readonly view: ResumeView;
  /** Called with the page count each time pagination settles. */
  readonly onSettled?: (pages: number) => void;
  /** Scale the pages down (never up) to fit this many CSS pixels across. A visual transform: layout is unaffected. */
  readonly fitWidth?: number | undefined;
}

/** Waits for web fonts before the first measurement (M3 themes use system fonts, so this is normally immediate). */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(() => typeof document === 'undefined' || !('fonts' in document) || document.fonts.status === 'loaded');
  useEffect(() => {
    if (ready) return;
    let live = true;
    void document.fonts.ready.then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, [ready]);
  return ready;
}

/**
 * The paginated resume: the PDF's DOM. Blocks are measured once each (hidden, at the content width), the engine
 * places them, and each page is a fixed-size sheet with its fragments at the engine's y. Typing re-measures only
 * the edited block and re-renders only pages whose layout changed.
 *
 * Hooks for agents and tests: `data-pagination-state` (measuring | settled), `data-page-count`, `data-theme-base`,
 * and `data-page` on each sheet.
 */
export function ResumePreview({ view: liveView, onSettled, fitWidth }: ResumePreviewProps) {
  const view = useDeferredValue(liveView);
  const variant = view.variant;
  const theme = useMemo(() => resolveTheme(variant), [variant]);
  const blocks = useMemo(() => buildFlow(view, theme), [view, theme]);
  const { page, marginsMm } = theme.customization;
  const size = useMemo(() => pageSize(page, marginsMm), [page, marginsMm]);
  const width = contentBox(size).w;
  const input = useMemo<LayoutInput<RenderBlock>>(() => ({ blocks, size, styleHash: theme.styleHash }), [blocks, size, theme.styleHash]);

  const [engine] = useState(() => new PreviewEngine());
  // Bumped after each measuring pass, so `missing` is recomputed against the engine's (mutable) cache.
  const [measuredPasses, setMeasuredPasses] = useState(0);
  const fontsReady = useFontsReady();
  const missing = useMemo(
    () => (fontsReady ? engine.missing(blocks, theme.styleHash, width) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measuredPasses stands for the engine's cache contents
    [engine, blocks, theme.styleHash, width, fontsReady, measuredPasses],
  );
  const fresh = fontsReady && missing.length === 0 ? engine.layout(input) : null;
  const layout = fresh ?? engine.last;
  // Not settled while a newer view is still deferred behind this render: the pages are about to change.
  const state: PaginationState = fresh && view === liveView ? 'settled' : 'measuring';

  const measureRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root || missing.length === 0) return;
    const gap = theme.sectionGapPt * PX_PER_PT;
    for (const b of missing) {
      const holder = root.querySelector<HTMLElement>(`[data-measure="${CSS.escape(b.key)}"]`);
      const full = holder?.querySelector<HTMLElement>(':scope > [data-block]');
      if (!full) continue;
      const cont = holder?.querySelector<HTMLElement>(':scope > [data-measure-continued] > [data-block]') ?? null;
      engine.record(b, theme.styleHash, width, measureBlock(full, cont, gap));
    }
    setMeasuredPasses((n) => n + 1);
  }, [missing, engine, theme.sectionGapPt, theme.styleHash, width]);

  const pageCount = layout?.pages.length ?? 0;
  useEffect(() => {
    if (state === 'settled') onSettled?.(pageCount);
  }, [state, pageCount, onSettled]);

  return (
    <div
      className={styles.preview}
      data-component="resume-preview"
      data-pagination-state={state}
      data-page-count={layout ? String(pageCount) : undefined}
      data-theme-base={theme.base.id}
    >
      {missing.length ? <MeasureArea blocks={missing} theme={theme} width={width} measureRef={measureRef} /> : null}
      {layout ? <Pages layout={layout} theme={theme} view={view} scale={fitWidth ? Math.min(1, fitWidth / size.w) : 1} /> : null}
    </div>
  );
}

function MeasureArea(props: {
  readonly blocks: readonly RenderBlock[];
  readonly theme: ResolvedTheme;
  readonly width: number;
  readonly measureRef: RefObject<HTMLDivElement | null>;
}) {
  const { blocks, theme, width, measureRef } = props;
  return (
    <div ref={measureRef} className={styles.measure} style={{ ...(theme.cssVars as CSSProperties), width }} aria-hidden="true" inert>
      <OnSurface surface="page">
        {blocks.map((b) => (
          <div key={b.key} data-measure={b.key}>
            <BlockView {...b.view} blockKey={b.key} range={ALL_ATOMS} />
            {b.view.shape === 'identity' ? null : (
              <div data-measure-continued="">
                <BlockView {...b.view} blockKey={b.key} range={CONTINUED_FRAME} />
              </div>
            )}
          </div>
        ))}
      </OnSurface>
    </div>
  );
}

/**
 * The sheets, scaled down to fit the pane with a transform. A transform scales the drawing without re-laying it
 * out, so lines wrap exactly as they will print (CSS zoom re-lays text at the smaller size). The outer box takes
 * the scaled size so the pane scrolls correctly.
 */
function Pages(props: { readonly layout: PagedLayout<RenderBlock>; readonly theme: ResolvedTheme; readonly view: ResumeView; readonly scale: number }) {
  const { layout, theme, view, scale } = props;
  const n = layout.pages.length;
  const { w, h } = layout.size;
  const fullHeight = n * h + (n - 1) * PAGE_GAP;
  return (
    <div className={styles.fit} style={{ width: w * scale, height: fullHeight * scale }} data-scale={String(scale)}>
      <article
        className={styles.resume}
        lang={view.lang}
        aria-label={`Resume preview, ${String(n)} ${n === 1 ? 'page' : 'pages'}`}
        data-testid="resume-preview"
        style={{ ...(theme.cssVars as CSSProperties), width: w, gap: PAGE_GAP, transform: scale === 1 ? undefined : `scale(${String(scale)})` }}
      >
        {layout.pages.map((p, i) => (
          <PageView key={i} page={p} number={i + 1} size={layout.size} blocks={layout.blocks} />
        ))}
      </article>
    </div>
  );
}

interface PageViewProps {
  readonly page: PageBox;
  readonly number: number;
  readonly size: PageSize;
  readonly blocks: ReadonlyMap<string, RenderBlock>;
}

/**
 * A page re-renders only when the engine produced a new PageBox for it (its fragments or their blocks changed).
 * Colors are CSS variables on the article, so a color-only theme change repaints without re-rendering pages.
 */
const PageView = memo(
  function PageView({ page, number, size, blocks }: PageViewProps) {
    const margin = size.marginPx;
    return (
      <div className={styles.sheet} style={{ width: size.w, height: size.h }} data-page={number} data-overflow={page.overflow ? '' : undefined}>
        <OnSurface surface="page">
          <div className={styles.content} style={{ inset: margin }}>
            {page.regions.flatMap((r) =>
              r.fragments.map((f) => {
                const b = blocks.get(f.key);
                if (!b) return null;
                return (
                  <div key={`${f.key}:${String(f.range.from)}`} className={styles.fragment} style={{ top: f.y }} data-fragment-h={String(f.h)}>
                    <BlockView {...b.view} blockKey={b.key} range={f.range} />
                  </div>
                );
              }),
            )}
          </div>
        </OnSurface>
      </div>
    );
  },
  (a, b) => a.page === b.page && a.number === b.number && a.size === b.size,
);
