import { contentBox, layoutDocument, type LayoutInput, type Measured, type PagedLayout, type Px } from '@/engine';
import type { RenderBlock } from './flow';

const cacheKey = (b: RenderBlock, styleHash: string, width: Px) => `${b.contentHash}|${styleHash}|${String(width)}`;

/**
 * Holds what makes the preview incremental across renders: measurements keyed by (content, style, width), so an
 * unchanged block is never measured twice, and the previous layout, so the engine reuses untouched pages.
 * Owned by one ResumePreview; plain mutable state outside React.
 */
export class PreviewEngine {
  readonly #measured = new Map<string, Measured>();
  #prev: PagedLayout<RenderBlock> | undefined;
  #lastInput: LayoutInput<RenderBlock> | undefined;

  /** Blocks with no measurement yet at this style and width. */
  missing(blocks: readonly RenderBlock[], styleHash: string, width: Px): RenderBlock[] {
    return blocks.filter((b) => !this.#measured.has(cacheKey(b, styleHash, width)));
  }

  record(block: RenderBlock, styleHash: string, width: Px, m: Measured): void {
    this.#measured.set(cacheKey(block, styleHash, width), m);
  }

  /** Forget every measurement (fonts changed under them). The previous layout stays as the reuse baseline. */
  clearMeasurements(): void {
    this.#measured.clear();
    this.#lastInput = undefined;
  }

  /** The layout for `input` once every block is measured; null while any is missing. Same input, same object. */
  layout(input: LayoutInput<RenderBlock>): PagedLayout<RenderBlock> | null {
    if (input === this.#lastInput && this.#prev) return this.#prev;
    if (this.missing(input.blocks, input.styleHash, contentWidthOf(input)).length) return null;
    const measurer = {
      measure: (b: RenderBlock, width: Px): Measured => {
        const m = this.#measured.get(cacheKey(b, input.styleHash, width));
        if (!m) throw new Error(`Block ${b.key} was laid out before it was measured`);
        return m;
      },
    };
    this.#prev = layoutDocument(input, measurer, this.#prev);
    this.#lastInput = input;
    return this.#prev;
  }

  /** The last layout computed, for showing while new blocks are measured. */
  get last(): PagedLayout<RenderBlock> | undefined {
    return this.#prev;
  }
}

function contentWidthOf(input: LayoutInput<RenderBlock>): Px {
  return contentBox(input.size).w;
}
