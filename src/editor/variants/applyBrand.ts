import { lookupBrand, type BrandResult, type CompanyQuery } from '@/brand';
import type { Command, ResumeId, VariantId } from '@/domain';

export interface BrandPorts {
  readonly dispatch: (resumeId: ResumeId, cmd: Command) => void;
  readonly announce?: (text: string) => void;
}

/** What the live region says after a lookup. Exported for the panel's tests. */
export function brandMessage(label: string, r: BrandResult): string {
  if (r.ok) return r.from === 'upload' ? `Applied your uploaded logo to the ${label} variant.` : `Applied the ${label} logo colors.`;
  switch (r.reason) {
    case 'unsupported-logo':
      return `That file isn’t a PNG, SVG or JPG image. The ${label} variant is unchanged.`;
    case 'logo-too-large':
      return `That logo is over 2 MB. The ${label} variant is unchanged.`;
    case 'unreadable-logo':
      return `Couldn’t read that image. The ${label} variant is unchanged.`;
    case 'offline':
      return `Couldn’t reach the logo service, so the ${label} variant keeps a placeholder palette.`;
    case 'not-found':
    case 'no-logo':
      return `No logo found for ${label}, so the variant keeps a placeholder palette. You can upload one in Design.`;
    default: {
      const _exhaustive: never = r;
      return _exhaustive;
    }
  }
}

/**
 * Looks the company up and, when a logo was found, re-pins the variant's brand snapshot (variant/refreshBrand).
 * The variant was created with the name-hash fallback, so it is usable while this runs and stays usable if
 * it fails. A variant deleted meanwhile makes refreshBrand a no-op.
 */
export async function applyBrand(
  ports: BrandPorts,
  resumeId: ResumeId,
  variantId: VariantId,
  label: string,
  query: CompanyQuery,
  options: { readonly picksReset?: boolean } = {},
): Promise<BrandResult> {
  const result = await lookupBrand(query);
  if (result.ok) ports.dispatch(resumeId, { type: 'variant/refreshBrand', variantId, target: result.profile });
  const reset = result.ok && options.picksReset ? ` ${PICKS_RESET}` : '';
  ports.announce?.(`${brandMessage(label, result)}${reset}`);
  return result;
}

/**
 * Drops the variant's uploaded logo and re-themes it from the fetched one, or from the placeholder palette when
 * none can be fetched. Color picks reset like any brand change.
 */
export async function removeUploadedLogo(ports: BrandPorts, resumeId: ResumeId, variantId: VariantId, label: string): Promise<BrandResult> {
  const result = await lookupBrand({ name: label }, { forgetUpload: true });
  ports.dispatch(resumeId, { type: 'variant/refreshBrand', variantId, target: result.ok ? result.profile : result.fallback });
  ports.announce?.(
    result.ok
      ? `Removed your uploaded logo. The ${label} variant uses the fetched logo again.`
      : `Removed your uploaded logo. No other logo was found, so the ${label} variant uses a placeholder palette.`,
  );
  return result;
}

/** Said when a new logo replaces one the user had picked colors from: its swatch indices no longer apply. */
export const PICKS_RESET = 'Your color picks were reset to automatic, because the new logo has different colors.';

/** True when the roles hold a numeric swatch pick, which a new logo resets (variant/refreshBrand). */
export const hasSwatchPicks = (roles: { readonly accent: unknown; readonly secondary?: unknown }) =>
  typeof roles.accent === 'number' || typeof roles.secondary === 'number';
