import { useId, useState } from 'react';
import type { CompanyPersona } from '@/domain';
import { useAnnounce, useDispatch, useVariant } from '@/store';
import { VOCAB_WORDS } from '@/themes';
import { useEditorScope } from '../context';
import { applyPersona } from '../variants/applyBrand';

const INDUSTRY: Readonly<Record<CompanyPersona['industry'], string>> = {
  technology: 'Technology',
  finance: 'Finance',
  consulting: 'Consulting',
  media: 'Media and entertainment',
  retail: 'Retail',
  health: 'Health',
  public: 'Public sector and non-profit',
  other: 'General',
};

/** Design → Company persona (M4b): what the persona chose for this variant, and a way to turn it off or back on. */
export function PersonaCard() {
  const { resumeId, variantId, variantLabel } = useEditorScope();
  const variant = useVariant(resumeId, variantId);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const headingId = useId();
  const [busy, setBusy] = useState(false);
  if (!variant) return null;
  const { persona } = variant;
  const domain = variant.brand.domain;

  const turnOn = async () => {
    if (!domain) return;
    setBusy(true);
    const p = await applyPersona({ dispatch, announce }, resumeId, variantId, domain, variantLabel);
    setBusy(false);
    announce(p ? `Applied the ${variantLabel} persona.` : `Couldn’t get a persona for ${variantLabel} right now.`);
  };

  const words = persona ? Object.values(VOCAB_WORDS[persona.vocab]) : [];
  return (
    <section className="card" aria-labelledby={headingId} data-testid="persona-card" data-persona={persona ? persona.source : 'none'}>
      <h2 id={headingId}>Company persona</h2>
      {persona ? (
        <>
          <dl className="persona-facts">
            <dt>Industry</dt>
            <dd>{INDUSTRY[persona.industry]}</dd>
            <dt>Tone</dt>
            <dd>{persona.tone}</dd>
            <dt>Headings</dt>
            <dd>{words.length ? words.join(', ') : 'the standard ones'}</dd>
            <dt>Centerpiece</dt>
            <dd>{persona.centerpiece === 'score-dial' ? 'Score dial (your strongest % metric, beside your name)' : 'None'}</dd>
          </dl>
          <p className="field-hint">
            {persona.source === 'ai'
              ? 'Chosen by AI from a fixed list, using the company’s website. Colors still come only from its logo.'
              : 'Chosen by keyword rules from the company’s website (AI is off).'}{' '}
            Sections you renamed keep your titles.
          </p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              dispatch(resumeId, { type: 'variant/setPersona', variantId, persona: null });
              announce(`Turned off the persona for the ${variantLabel} variant.`);
            }}
          >
            Turn off persona
          </button>
        </>
      ) : (
        <>
          <p className="field-hint">
            {domain
              ? `No persona. Apply one to use ${variantLabel}-style section headings and a centerpiece.`
              : 'A persona needs the company’s website: create the variant from a company the logo lookup finds.'}
          </p>
          {domain ? (
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void turnOn()}>
              Apply persona
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
