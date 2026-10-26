import { createPortal } from 'react-dom';
import { memo, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { ResumeView } from '@/domain';
import { contentBox, pageSize, type LayoutInput, type PageBox, type PagedLayout, type PageSize, type RegionId } from '@/engine';
import { ALL_ATOMS, BlockView, OnSurface, type AtomRange } from '@/primitives';
import { resolveTheme, type ResolvedTheme } from '@/themes';
import { buildFlow, type RenderBlock } from './flow';
import { measureBlock } from './measureDom';
import { createPageZipper, pageFrame, type Band, type PageFrame, type RegionFrame } from './regions';
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

interface RegionLayout {
  readonly frame: RegionFrame;
  readonly missing: readonly RenderBlock[];
  readonly fresh: PagedLayout<RenderBlock> | null;
  readonly layout: PagedLayout<RenderBlock> | undefined;
  readonly measureRef: RefObject<HTMLDivElement | null>;
}

/**
 * One column's measure → paginate loop: its own measurement cache and reuse baseline, at its own width. A
 * multi-column page runs one per column, so each column breaks across pages independently.
 */
function useRegionLayout(frame: RegionFrame, blocks: readonly RenderBlock[], theme: ResolvedTheme, fontsReady: boolean): RegionLayout {
  const width = frame.width;
  const input = useMemo<LayoutInput<RenderBlock>>(
    () => ({ blocks, size: frame.size, styleHash: theme.styleHash, region: frame.id }),
    [blocks, frame.size, frame.id, theme.styleHash],
  );
  const [engine] = useState(() => new PreviewEngine());
  // Bumped after each measuring pass, so `missing` is recomputed against the engine's (mutable) cache.
  const [measuredPasses, setMeasuredPasses] = useState(0);
  const missing = useMemo(
    () => (fontsReady ? engine.missing(blocks, theme.styleHash, width) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measuredPasses stands for the engine's cache contents
    [engine, blocks, theme.styleHash, width, fontsReady, measuredPasses],
  );
  const fresh = fontsReady && missing.length === 0 ? engine.layout(input) : null;

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
  return { frame, missing, fresh, layout: fresh ?? engine.last, measureRef };
}

const NO_BLOCKS: readonly RenderBlock[] = [];

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
  const frame = useMemo(() => pageFrame(theme.base.layout, size), [theme.base.layout, size]);
  const [mainFrame, sideFrame] = frame.regions;
  const mainBlocks = useMemo(() => blocks.filter((b) => b.region === 'main'), [blocks]);
  const sideBlocks = useMemo(() => (sideFrame ? blocks.filter((b) => b.region === 'side') : NO_BLOCKS), [blocks, sideFrame]);

  const fontsReady = useFontsReady();
  // Hooks run unconditionally: a single-column theme feeds the side column nothing.
  const main = useRegionLayout(mainFrame ?? FALLBACK_FRAME(size), mainBlocks, theme, fontsReady);
  const side = useRegionLayout(sideFrame ?? FALLBACK_SIDE(size), sideBlocks, theme, fontsReady);
  const regions = sideFrame ? [main, side] : [main];

  const [zip] = useState(createPageZipper);
  const laidOut = regions.every((r) => r.layout);
  const pages = laidOut ? zip(frame.regions, regions.map((r) => r.layout?.pages ?? [])) : null;
  const lookup = useMemo(() => new Map([...(main.layout?.blocks ?? []), ...(side.layout?.blocks ?? [])]), [main.layout, side.layout]);
  // Not settled while a newer view is still deferred behind this render: the pages are about to change.
  const state: PaginationState = regions.every((r) => r.fresh) && view === liveView ? 'settled' : 'measuring';

  const pageCount = pages?.length ?? 0;
  useEffect(() => {
    if (state === 'settled') onSettled?.(pageCount);
  }, [state, pageCount, onSettled]);

  return (
    <div
      className={styles.preview}
      data-component="resume-preview"
      data-pagination-state={state}
      data-page-count={pages ? String(pageCount) : undefined}
      data-theme-base={theme.base.id}
      data-layout={theme.base.layout.kind}
    >
      {/* Portaled to <body>: the pane may be display:none (narrow screens), and nothing can be measured inside that. */}
      {regions.map((r) =>
        r.missing.length
          ? createPortal(<MeasureArea key={r.frame.id} region={r} theme={theme} />, document.body, `measure-${r.frame.id}`)
          : null,
      )}
      <style>{`@page { size: ${page === 'A4' ? 'A4' : 'letter'}; margin: 0; }`}</style>
      {pages ? (
        <Pages pages={pages} size={size} frame={frame} blocks={lookup} theme={theme} view={view} scale={fitWidth ? Math.min(1, fitWidth / size.w) : 1} />
      ) : null}
    </div>
  );
}

const FALLBACK_FRAME = (size: PageSize): RegionFrame => ({ id: 'main', x: 0, width: contentBox(size).w, surface: 'page', size });
const FALLBACK_SIDE = (size: PageSize): RegionFrame => ({ ...FALLBACK_FRAME(size), id: 'side' });

function MeasureArea({ region, theme }: { readonly region: RegionLayout; readonly theme: ResolvedTheme }) {
  const { frame, missing, measureRef } = region;
  return (
    <div
      ref={measureRef}
      className={styles.measure}
      style={{ ...(theme.cssVars as CSSProperties), width: frame.width }}
      aria-hidden="true"
      inert
      data-measure-region={frame.id}
    >
      <OnSurface surface={frame.surface}>
        {missing.map((b) => (
          <div key={b.key} data-measure={b.key}>
            <BlockView {...b.view} blockKey={b.key} range={ALL_ATOMS} surface={frame.surface} />
            {b.view.shape === 'identity' ? null : (
              <div data-measure-continued="">
                <BlockView {...b.view} blockKey={b.key} range={CONTINUED_FRAME} surface={frame.surface} />
              </div>
            )}
          </div>
        ))}
      </OnSurface>
    </div>
  );
}

interface PagesProps {
  readonly pages: readonly PageBox[];
  readonly size: PageSize;
  readonly frame: PageFrame;
  readonly blocks: ReadonlyMap<string, RenderBlock>;
  readonly theme: ResolvedTheme;
  readonly view: ResumeView;
  readonly scale: number;
}

/**
 * The sheets, scaled down to fit the pane with a transform. A transform scales the drawing without re-laying it
 * out, so lines wrap exactly as they will print (CSS zoom re-lays text at the smaller size). The outer box takes
 * the scaled size so the pane scrolls correctly.
 */
function Pages({ pages, size, frame, blocks, theme, view, scale }: PagesProps) {
  const n = pages.length;
  const { w, h } = size;
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
        {pages.map((p, i) => (
          <PageView key={i} page={p} number={i + 1} size={size} frame={frame} blocks={blocks} />
        ))}
      </article>
    </div>
  );
}

interface PageViewProps {
  readonly page: PageBox;
  readonly number: number;
  readonly size: PageSize;
  readonly frame: PageFrame;
  readonly blocks: ReadonlyMap<string, RenderBlock>;
}

/**
 * A page re-renders only when the engine produced a new PageBox for it (its fragments or their blocks changed).
 * Colors are CSS variables on the article, so a color-only theme change repaints without re-rendering pages.
 */
const PageView = memo(
  function PageView({ page, number, size, frame, blocks }: PageViewProps) {
    const margin = size.marginPx;
    const frames = new Map<RegionId, RegionFrame>(frame.regions.map((r) => [r.id, r]));
    return (
      <div className={styles.sheet} style={{ width: size.w, height: size.h }} data-page={number} data-overflow={page.overflow ? '' : undefined}>
        <OnSurface surface="page">
          {frame.band ? <SideBand band={frame.band} /> : null}
          <div className={styles.content} style={{ inset: margin }}>
            {page.regions.map((r) => {
              const f = frames.get(r.id);
              if (!f) return null;
              return (
                <div key={r.id} className={styles.region} style={{ left: f.x, width: f.width }} data-region={r.id}>
                  {r.fragments.map((frag) => {
                    const b = blocks.get(frag.key);
                    if (!b) return null;
                    return (
                      <div key={`${frag.key}:${String(frag.range.from)}`} className={styles.fragment} style={{ top: frag.y }} data-fragment-h={String(frag.h)}>
                        <BlockView {...b.view} blockKey={b.key} range={frag.range} surface={f.surface} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </OnSurface>
      </div>
    );
  },
  (a, b) => a.page === b.page && a.number === b.number && a.size === b.size && a.frame === b.frame,
);

/** The side column's fill, edge to edge from the top of the sheet to the bottom. */
function SideBand({ band }: { readonly band: Band }) {
  return (
    <OnSurface surface={band.surface}>
      <div className={styles.band} style={{ [band.side]: 0, width: band.width }} data-band={band.side} />
    </OnSurface>
  );
}
