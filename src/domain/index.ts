// domain: the normalized resume model, its commands and read model. Pure; no React, no storage.
export type * from './brand';
export type * from './model';
export { CONTACT_KINDS, DEFAULT_CUSTOMIZATION, DEFAULT_ROLES } from './model';
export type { Command, CommandType } from './commands';
export { applyCommand } from './applyCommand';
export { resolveView, type ResumeView } from './view';
export { createDocument, checkInvariants, normalizeDocument, type NewDocument } from './document';
export { newId } from './ids';
export { parseDataUrl, parseDomain, parsePartialDate, parseSafeUrl } from './values';
export { formatRichText, isRichTextEmpty, parseRichText, richTextToPlain } from './richText';
export { deepEqual } from './equal';
export { FOREGROUND_ROLES, SURFACE_NAMES, type ForegroundRole, type SurfaceName } from './surface';
export { hashString } from './hash';
