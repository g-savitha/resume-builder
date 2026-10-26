import { createContext, use, type ComponentType, type ReactNode } from 'react';
import type { EntryContent, IdentityContent } from '@/domain';

/**
 * The bespoke escape hatch for presets (M6), kept narrow: a preset may redraw an entry's header line and the
 * identity block's inside, nothing else. The kit still owns the atoms (so pagination is unchanged), the heading
 * levels (a bespoke `Heading` is the h1 in identity and an h3 in an entry head), the body, the tags and the
 * surfaces. Bespoke components receive only shape content and draw with Text, Heading, Decor and OnSurface.
 */
export interface BespokeIdentityProps {
  readonly identity: IdentityContent;
}
export interface BespokeEntryHeadProps {
  readonly entry: EntryContent;
  /** The entry's position in its section, from 0. */
  readonly index: number;
}
export interface BespokeBlocks {
  readonly identity?: ComponentType<BespokeIdentityProps>;
  readonly entryHead?: ComponentType<BespokeEntryHeadProps>;
}

const NONE: BespokeBlocks = {};
const BespokeContext = createContext<BespokeBlocks>(NONE);

/** Set by render around the pages and the measuring area, from the resolved theme. */
export function BespokeProvider({ blocks, children }: { readonly blocks: BespokeBlocks | undefined; readonly children: ReactNode }) {
  return <BespokeContext value={blocks ?? NONE}>{children}</BespokeContext>;
}

export const useBespoke = (): BespokeBlocks => use(BespokeContext);
