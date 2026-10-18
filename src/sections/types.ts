import type { IconName } from '@/icons';
import type { Contact, DataUrl, DateRange, RichText, ShapeContent, ShapeName, Tag } from '@/domain';

/** Editor field spec. Forms are generated from it; `label` is required, so an unlabeled field can't exist. */
export type FieldSpec =
  | { readonly k: 'text'; readonly label: string; readonly required?: boolean; readonly multiline?: boolean; readonly placeholder?: string }
  | { readonly k: 'rich'; readonly label: string; readonly placeholder?: string }
  | { readonly k: 'dateRange'; readonly label: string }
  | { readonly k: 'url'; readonly label: string; readonly placeholder?: string }
  | { readonly k: 'tags'; readonly label: string; readonly withLevel?: boolean; readonly placeholder?: string }
  | { readonly k: 'contacts'; readonly label: string }
  | { readonly k: 'image'; readonly label: string };

export type FieldKind = FieldSpec['k'];

export type ValueOf<F extends FieldSpec> = F extends { k: 'text' | 'url' }
  ? string
  : F extends { k: 'rich' }
    ? RichText
    : F extends { k: 'dateRange' }
      ? DateRange
      : F extends { k: 'tags' }
        ? readonly Tag[]
        : F extends { k: 'contacts' }
          ? readonly Contact[]
          : F extends { k: 'image' }
            ? DataUrl | null
            : never;

export type ItemData<Fs extends Record<string, FieldSpec>> = { readonly [K in keyof Fs]: ValueOf<Fs[K]> };

/**
 * A section kind. No `kind` field: the kind IS the folder name (derived by the glob, never typed twice).
 * Methods (not function-typed properties) so a specific SectionDef<Fs,S> is usable where SectionDef is expected.
 */
export interface SectionDef<Fs extends Record<string, FieldSpec> = Record<string, FieldSpec>, S extends ShapeName = ShapeName> {
  readonly defaultLabel: string;
  readonly defaultIcon?: IconName;
  readonly cardinality: 'single' | 'many';
  readonly item: Fs;
  readonly shape: S;
  /** Field whose value names an item in lists (e.g. 'role'). Defaults to the first text field. */
  readonly titleField?: keyof Fs & string;
  /** Pure; memoized per item identity. Its output hash keys the measure cache. */
  project(item: ItemData<Fs>): ShapeContent[S];
  /** io/ builds the whole JSON Resume adapter from these (no second section list). */
  readonly jsonResume?: {
    readonly key: string;
    from(raw: unknown): Partial<ItemData<Fs>>;
    to(it: ItemData<Fs>): unknown;
  };
}
