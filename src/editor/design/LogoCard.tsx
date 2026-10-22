import { useId, useRef, useState } from 'react';
import { useAnnounce, useDispatch, useVariant } from '@/store';
import { useEditorScope } from '../context';
import { applyBrand, brandMessage } from '../variants/applyBrand';

/** Upload your own logo for the active variant. It replaces the fetched one, for this company from now on. */
export function LogoCard() {
  const { resumeId, variantId, variantLabel } = useEditorScope();
  const variant = useVariant(resumeId, variantId);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ readonly kind: 'idle' | 'reading' } | { readonly kind: 'error'; readonly message: string }>({ kind: 'idle' });
  if (!variant) return null;
  const { logo, domain, palette } = variant.brand;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setState({ kind: 'reading' });
    const result = await applyBrand({ dispatch, announce }, resumeId, variantId, variantLabel, { name: variant.label, logoFile: file });
    setState(result.ok ? { kind: 'idle' } : { kind: 'error', message: brandMessage(variantLabel, result) });
    if (input.current) input.current.value = '';
  };

  return (
    <section className="card" aria-labelledby={`${inputId}-h`} data-logo-state={state.kind}>
      <h2 id={`${inputId}-h`}>Logo</h2>
      <div className="logo-current">
        {logo ? <img className="logo-chip logo-chip-lg" src={logo.dataUrl} alt={`Current logo for ${variantLabel}`} /> : null}
        <p className="field-hint">
          {palette.source === 'logo'
            ? `Colors come from this logo${domain ? ` (${domain})` : ''}.`
            : 'No logo yet: the resume uses a placeholder palette.'}
        </p>
      </div>
      <div className="field">
        <label htmlFor={inputId}>Upload a logo for {variantLabel}</label>
        <input
          ref={input}
          id={inputId}
          className="input"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
          aria-describedby={`${inputId}-hint${state.kind === 'error' ? ` ${inputId}-error` : ''}`}
          aria-invalid={state.kind === 'error'}
          disabled={state.kind === 'reading'}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <p id={`${inputId}-hint`} className="field-hint">
          PNG, SVG or JPG, up to 2 MB. It replaces the fetched logo for {variantLabel}, in this variant and in new ones.
        </p>
        {state.kind === 'error' ? (
          <p id={`${inputId}-error`} className="field-error">
            {state.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
