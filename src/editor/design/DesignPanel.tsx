import { useId } from 'react';
import { useAnnounce, useDispatch, useVariant } from '@/store';
import type { ThemeBaseRef } from '@/domain';
import { ARCHETYPES, PRESETS, themeBaseFor, type ImplementedArchetype } from '@/themes';
import { useEditorScope } from '../context';
import { LogoCard } from './LogoCard';
import { CustomizeCard } from './CustomizeCard';
import { PersonaCard } from './PersonaCard';
import { SwatchPicker } from './SwatchPicker';

const HINTS: Readonly<Record<ImplementedArchetype, string>> = {
  classic: 'Default. Name banner in the brand color, entries with dates on the right.',
  'ats-plain': 'Plain single column, no color fills. For applicant tracking systems.',
  sidebar: 'Two columns: name, contacts and skills in a brand-colored left column.',
  'app-ui': 'Product look: rounded brand header, entry cards and a grey skills rail on the right.',
};
interface Choice {
  readonly id: string;
  readonly ref: ThemeBaseRef;
  readonly label: string;
  readonly hint: string;
}
/** The archetypes, then every preset folder (M6). */
const CHOICES: readonly Choice[] = [
  ...(Object.keys(HINTS) as ImplementedArchetype[]).map((id) => ({ id, ref: { kind: 'archetype', id } as const, label: ARCHETYPES[id].label, hint: HINTS[id] })),
  ...[...PRESETS].map(([id, p]) => ({ id, ref: { kind: 'preset', id } as const, label: p.manifest.label, hint: p.manifest.hint })),
];

/**
 * Design: pick the active variant's theme (milestone 3), upload its logo and pick which logo colors it uses (milestone 4). Then customize its fonts, spacing, page size, icons and
 * text contrast (M5). Presets (M6) are listed after the archetypes.
 */
export function DesignPanel() {
  const { resumeId, variantId, variantLabel } = useEditorScope();
  const variant = useVariant(resumeId, variantId);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const name = useId();
  if (!variant) return null;
  const current = themeBaseFor(variant.themeBase, variant.brand.domain).id;
  return (
    <div className="panel-stack">
      <section className="card" aria-labelledby="design-h">
        <h2 id="design-h">Design</h2>
        <fieldset className="panel-stack theme-picker" data-testid="theme-picker">
          <legend>Theme for the {variantLabel} variant</legend>
          {CHOICES.map((choice) => (
            <ThemeChoice
              key={choice.id}
              choice={choice}
              name={name}
              checked={current === choice.id}
              onPick={() => {
                dispatch(resumeId, { type: 'variant/setBase', variantId, base: choice.ref });
                announce(`${choice.label} theme applied to the ${variantLabel} variant.`);
              }}
            />
          ))}
        </fieldset>
      </section>
      <LogoCard key={variantId} />
      <SwatchPicker />
      <PersonaCard />
      <CustomizeCard />
    </div>
  );
}

function ThemeChoice(props: { readonly choice: Choice; readonly name: string; readonly checked: boolean; readonly onPick: () => void }) {
  const inputId = useId();
  return (
    <div className={`variant-row${props.checked ? ' active' : ''}`} data-theme-choice={props.choice.id}>
      <input type="radio" id={inputId} name={props.name} checked={props.checked} onChange={props.onPick} />
      <label htmlFor={inputId}>
        <span className="name">{props.choice.label}</span>
        <span className="kind">{props.choice.hint}</span>
      </label>
    </div>
  );
}
