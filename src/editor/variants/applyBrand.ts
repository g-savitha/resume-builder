import { lookupBrand, type BrandResult, type CompanyQuery } from '@/brand';
import type { Command, ResumeId, VariantId } from '@/domain';

export interface BrandPorts {
  readonly dispatch: (resumeId: ResumeId, cmd: Command) => void;
  readonly announce?: (text: string) => void;
}

/** What the live region says after a lookup. Exported for the panel's tests. */
export function brandMessage(label: string, r: BrandResult): string {
  if (r.ok) return `Applied the ${label} logo colors.`;
  switch (r.reason) {
    case 'offline':
      return `Couldn’t reach the logo service, so the ${label} variant keeps a placeholder palette.`;
    case 'not-found':
    case 'no-logo':
      return `No logo found for ${label}, so the variant keeps a placeholder palette.`;
    default: {
      const _exhaustive: never = r.reason;
      return _exhaustive;
    }
  }
}

/**
 * Looks the company up and, when a logo was found, re-pins the variant's brand snapshot (variant/refreshBrand).
 * The variant was created with the name-hash fallback, so it is usable while this runs and stays usable if
 * it fails. A variant deleted meanwhile makes refreshBrand a no-op.
 */
export async function applyBrand(ports: BrandPorts, resumeId: ResumeId, variantId: VariantId, label: string, query: CompanyQuery): Promise<BrandResult> {
  const result = await lookupBrand(query);
  if (result.ok) ports.dispatch(resumeId, { type: 'variant/refreshBrand', variantId, target: result.profile });
  ports.announce?.(brandMessage(label, result));
  return result;
}
