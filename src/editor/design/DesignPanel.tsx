import { useId } from 'react';
import { useAnnounce, useDispatch, useVariant } from '@/store';
import { ARCHETYPES, themeBaseFor, type ImplementedArchetype } from '@/themes';
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
const CHOICES = Object.keys(HINTS) as readonly ImplementedArchetype[];

/**
 * Design: pick the active variant's theme (milestone 3), upload its logo and pick which logo colors it uses (milestone 4). Then customize its fonts, spacing, page size, icons and
 * text contrast (M5); presets with M6.
 */
export function DesignPanel() {
  const { resumeId, variantId, variantLabel } = useEditorScope();
  const variant = useVariant(resumeId, variantId);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const name = useId();
  if (!variant) return null;
  const current = themeBaseFor(variant.themeBase).id;
  return (
    <div className="panel-stack">
      <section className="card" aria-labelledby="design-h">
        <h2 id="design-h">Design</h2>
        <fieldset className="panel-stack theme-picker" data-testid="theme-picker">
          <legend>Theme for the {variantLabel} variant</legend>
          {CHOICES.map((id) => (
            <ThemeChoice
              key={id}
              id={id}
              name={name}
              checked={current === id}
              onPick={() => {
                dispatch(resumeId, { type: 'variant/setBase', variantId, base: { kind: 'archetype', id } });
                announce(`${ARCHETYPES[id].label} theme applied to the ${variantLabel} variant.`);
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

function ThemeChoice(props: { readonly id: ImplementedArchetype; readonly name: string; readonly checked: boolean; readonly onPick: () => void }) {
  const inputId = useId();
  return (
    <div className={`variant-row${props.checked ? ' active' : ''}`} data-theme-choice={props.id}>
      <input type="radio" id={inputId} name={props.name} checked={props.checked} onChange={props.onPick} />
      <label htmlFor={inputId}>
        <span className="name">{ARCHETYPES[props.id].label}</span>
        <span className="kind">{HINTS[props.id]}</span>
      </label>
    </div>
  );
}
