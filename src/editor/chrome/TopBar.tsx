import { useId, useState } from 'react';
import { Icon } from '@/icons';
import { printVariant } from '@/render';
import { useAnnounce, useDispatch, useResumeName, useVariant, useVariantOrder, useVariantView } from '@/store';
import type { VariantId } from '@/domain';
import { useEditorScope } from '../context';
import { SaveIndicator } from './SaveIndicator';
import { useUiTheme } from './uiTheme';

export function TopBar() {
  const { resumeId, variantId } = useEditorScope();
  const name = useResumeName(resumeId);
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="fileText" />
        </span>
        <h1>Resume builder</h1>
      </div>
      <nav className="crumbs" aria-label="Current resume">
        <span>{name}</span>
        <span aria-hidden="true">/</span>
        <VariantSelect resumeId={resumeId} activeId={variantId} />
      </nav>
      <div className="spacer" />
      <SaveIndicator />
      <ThemeToggle />
      <ExportPdfButton />
    </header>
  );
}

function VariantSelect({ resumeId, activeId }: { readonly resumeId: Parameters<typeof useResumeName>[0]; readonly activeId: VariantId }) {
  const id = useId();
  const order = useVariantOrder(resumeId);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  return (
    <span className="chip-select">
      <label htmlFor={id} className="sr-only">
        Variant (target company)
      </label>
      <select
        id={id}
        value={activeId}
        onChange={(e) => {
          const next = order.find((v) => v === e.target.value);
          if (!next) return;
          dispatch(resumeId, { type: 'variant/select', variantId: next });
          announce('Switched variant. Hide and show settings now apply to it.');
        }}
      >
        {order.map((v) => (
          <VariantOption key={v} resumeId={resumeId} variantId={v} />
        ))}
      </select>
      <Icon name="chevronDown" />
    </span>
  );
}

function VariantOption({ resumeId, variantId }: { readonly resumeId: Parameters<typeof useResumeName>[0]; readonly variantId: VariantId }) {
  const variant = useVariant(resumeId, variantId);
  return <option value={variantId}>{variant ? `${variant.label} variant` : 'Variant'}</option>;
}

/** A toggle button: its name stays "Light theme" and aria-pressed says whether it is on. */
function ThemeToggle() {
  const [theme, toggle] = useUiTheme();
  return (
    <button type="button" className="btn btn-ghost btn-sm" aria-pressed={theme === 'light'} onClick={toggle}>
      <Icon name={theme === 'light' ? 'sun' : 'moon'} /> Light theme
    </button>
  );
}

/**
 * Prints the preview (same DOM) through the browser's dialog, where "Save as PDF" makes the file.
 * The PDF is titled "<resume> – <variant>" and carries the resume's language.
 */
function ExportPdfButton() {
  const { resumeId, variantId } = useEditorScope();
  const view = useVariantView({ resumeId, variantId });
  const announce = useAnnounce();
  const [busy, setBusy] = useState(false);
  const exportPdf = () => {
    if (!view || busy) return;
    setBusy(true);
    announce('Preparing the PDF. In the print dialog, choose “Save as PDF”.');
    printVariant(view)
      .catch((err: unknown) => {
        announce(err instanceof Error ? err.message : 'The PDF could not be prepared.');
      })
      .finally(() => {
        setBusy(false);
      });
  };
  return (
    <button type="button" className="btn btn-primary" onClick={exportPdf} aria-disabled={busy || !view} data-testid="export-pdf">
      <Icon name="download" /> Export PDF
    </button>
  );
}
