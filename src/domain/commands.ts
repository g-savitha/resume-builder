import type { BrandProfile, RoleChoice, ThemeBaseRef } from './brand';
import type { CompanyPersona } from './persona';
import type { Customization, FieldValue, FontPairId, ItemId, NodeId, Section, SectionId, SectionKind, VariantId } from './model';

/** A partial customization; `fontPair: null` goes back to the theme's own font. */
export type CustomizationPatch = Partial<Omit<Customization, 'fontPair'>> & { readonly fontPair?: FontPairId | null };

/** Every edit. All idempotent: carry target values/indices and client ids, never deltas. */
export type Command =
  | { readonly type: 'item/set'; readonly itemId: ItemId; readonly field: string; readonly value: FieldValue }
  | { readonly type: 'item/create'; readonly sectionId: SectionId; readonly itemId: ItemId; readonly atIndex: number }
  | { readonly type: 'item/delete'; readonly itemId: ItemId }
  | { readonly type: 'item/move'; readonly itemId: ItemId; readonly toSection: SectionId; readonly toIndex: number }
  | {
      readonly type: 'section/create';
      readonly sectionId: SectionId;
      readonly kind: SectionKind;
      readonly atIndex: number;
      readonly custom?: Section['custom'];
    }
  | { readonly type: 'section/delete'; readonly sectionId: SectionId }
  | { readonly type: 'section/rename'; readonly sectionId: SectionId; readonly title: string | undefined }
  | { readonly type: 'section/move'; readonly sectionId: SectionId; readonly toIndex: number }
  | { readonly type: 'visibility/set'; readonly variantId: VariantId; readonly node: NodeId; readonly hidden: boolean }
  | {
      readonly type: 'variant/create';
      readonly variantId: VariantId;
      readonly target: BrandProfile;
      readonly base: ThemeBaseRef;
      readonly copyFrom?: VariantId;
    }
  | { readonly type: 'variant/select'; readonly variantId: VariantId }
  | { readonly type: 'variant/refreshBrand'; readonly variantId: VariantId; readonly target: BrandProfile }
  | { readonly type: 'variant/customize'; readonly variantId: VariantId; readonly patch: CustomizationPatch }
  | { readonly type: 'variant/setRoles'; readonly variantId: VariantId; readonly roles: RoleChoice }
  | { readonly type: 'variant/setBase'; readonly variantId: VariantId; readonly base: ThemeBaseRef }
  | { readonly type: 'variant/setPersona'; readonly variantId: VariantId; readonly persona: CompanyPersona | null }
  | { readonly type: 'variant/delete'; readonly variantId: VariantId };

export type CommandType = Command['type'];
