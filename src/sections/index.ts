// sections: every section kind, once. One folder per kind; the folder name is the kind.
export type { FieldKind, FieldSpec, ItemData, SectionDef, ValueOf } from './types';
export { defineSection, entry, f, readField, readItem, tagGroup } from './kit';
export {
  itemTitle,
  parseSectionKind,
  projectItem,
  sectionDef,
  sectionLabel,
  sectionRegistry,
  type Projected,
} from './registry';
export { CONTACT_ICON } from './contactIcons';
