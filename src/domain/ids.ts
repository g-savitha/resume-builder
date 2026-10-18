import type { ItemId, ResumeId, SectionId, VariantId } from './model';

/** Client-generated ids make every create command idempotent (replay finds the id already present). */
// The type parameter picks which id brand to mint (contract: newId<SectionId>()).
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function newId<T extends ResumeId | VariantId | SectionId | ItemId>(): T {
  return crypto.randomUUID() as T;
}
