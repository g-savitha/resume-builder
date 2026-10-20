import type { ItemId, ResumeId, SectionId, VariantId } from './model';

/** Client-generated ids make every create command idempotent (replay finds the id already present). */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the type parameter picks which id brand to mint (contract: newId<SectionId>())
export function newId<T extends ResumeId | VariantId | SectionId | ItemId>(): T {
  return crypto.randomUUID() as T;
}
