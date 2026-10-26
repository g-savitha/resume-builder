import { useId } from 'react';
import { DEFAULT_ROLES, type RoleChoice, type SwatchPick } from '@/domain';
import { useAnnounce, useDispatch, useVariant } from '@/store';
import { rolePreview, swatchOptions, type RoleColors, type SwatchOption } from '@/themes';
import { useEditorScope } from '../context';

type Role = 'accent' | 'secondary';

const ROLE_COPY: Readonly<Record<Role, { readonly legend: string; readonly auto: string; readonly where: string }>> = {
  accent: { legend: 'Accent color', auto: 'Automatic', where: 'name banner and headings' },
  secondary: { legend: 'Secondary color', auto: 'None', where: 'rules and banner links' },
};

/**
 * Design → Colors: choose which of the logo's swatches drives the accent and, optionally, the secondary role.
 * A pick is a numeric index into the variant's pinned palette (`variant/setRoles`); derivePalette still makes it
 * pass contrast, and the card says when it had to. There is no ground choice: the page stays white.
 */
export function SwatchPicker() {
  const { resumeId, variantId, variantLabel } = useEditorScope();
  const variant = useVariant(resumeId, variantId);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const headingId = useId();
  if (!variant) return null;
  const { palette } = variant.brand;
  const options = palette.source === 'logo' ? swatchOptions(palette) : [];
  const { roles } = variant;
  const preview = rolePreview(palette, roles);
  const automatic = typeof roles.accent !== 'number' && roles.secondary === undefined;

  const setRoles = (next: RoleChoice, message: string) => {
    dispatch(resumeId, { type: 'variant/setRoles', variantId, roles: next });
    announce(message);
  };
  const choose = (role: Role, option: SwatchOption | undefined) => {
    const next = withRole(roles, role, option?.index);
    const shown = rolePreview(palette, next)[role];
    const what = ROLE_COPY[role].legend;
    const message = option
      ? `${what} set to ${option.name} (${option.hex}) for the ${variantLabel} variant.${shown?.adjusted ? ` ${adjustedNote(role, shown)}` : ''}`
      : `${what} set to ${ROLE_COPY[role].auto.toLowerCase()} for the ${variantLabel} variant.`;
    setRoles(next, message);
  };

  return (
    <section className="card" aria-labelledby={headingId} data-testid="swatch-picker">
      <h2 id={headingId}>Colors</h2>
      {options.length === 0 ? (
        <p className="field-hint">Find or upload a logo to pick which of its colors the {variantLabel} resume uses.</p>
      ) : (
        <>
          <p className="field-hint">Pick from the {variantLabel} logo’s colors. The page stays white; text is darkened or lightened if needed so it stays readable.</p>
          {(['accent', 'secondary'] as const).map((role) => (
            <RoleGroup
              key={role}
              role={role}
              variantLabel={variantLabel}
              options={options}
              current={roles[role]}
              shown={preview[role]}
              onPick={(option) => { choose(role, option); }}
            />
          ))}
          <button
            type="button"
            className="btn"
            disabled={automatic}
            onClick={() => { setRoles(resetRoles(roles), `Colors for the ${variantLabel} variant reset to automatic.`); }}
          >
            Reset to automatic
          </button>
        </>
      )}
    </section>
  );
}

function RoleGroup(props: {
  readonly role: Role;
  readonly variantLabel: string;
  readonly options: readonly SwatchOption[];
  readonly current: SwatchPick | undefined;
  readonly shown: RoleColors | undefined;
  readonly onPick: (option: SwatchOption | undefined) => void;
}) {
  const name = useId();
  const noteId = useId();
  const copy = ROLE_COPY[props.role];
  const picked = typeof props.current === 'number' ? props.options.find((o) => o.index === props.current) : undefined;
  const note = picked && props.shown?.adjusted ? adjustedNote(props.role, props.shown) : undefined;
  return (
    <fieldset className="theme-picker swatch-group" data-role={props.role} aria-describedby={note ? noteId : undefined}>
      <legend>
        {copy.legend} for the {props.variantLabel} variant ({copy.where})
      </legend>
      <div className="swatch-row">
        <SwatchRadio name={name} checked={!picked} label={copy.auto} onPick={() => { props.onPick(undefined); }} />
        {props.options.map((o) => (
          <SwatchRadio
            key={o.index}
            name={name}
            checked={picked?.index === o.index}
            label={`${o.name} ${o.hex}`}
            hex={o.hex}
            title={`${String(Math.round(o.share * 100))}% of the logo`}
            onPick={() => { props.onPick(o); }}
          />
        ))}
      </div>
      {note ? (
        <p id={noteId} className="field-hint" data-testid={`contrast-note-${props.role}`}>
          {note}
        </p>
      ) : null}
    </fieldset>
  );
}

function SwatchRadio(props: {
  readonly name: string;
  readonly checked: boolean;
  readonly label: string;
  readonly hex?: string;
  readonly title?: string;
  readonly onPick: () => void;
}) {
  const id = useId();
  return (
    <div className={`swatch-choice${props.checked ? ' active' : ''}`} data-swatch={props.hex ?? 'auto'}>
      <input type="radio" id={id} name={props.name} checked={props.checked} onChange={props.onPick} />
      <label htmlFor={id} title={props.title}>
        {props.hex ? <span className="swatch-chip" aria-hidden="true" style={{ background: props.hex }} /> : null}
        <span>{props.label}</span>
      </label>
    </div>
  );
}

/** The role set to a swatch index, or back to automatic (accent) / none (secondary). Ground and boost are kept. */
function withRole(roles: RoleChoice, role: Role, index: number | undefined): RoleChoice {
  if (role === 'accent') return { ...roles, accent: index ?? DEFAULT_ROLES.accent };
  const { secondary: _drop, ...rest } = roles;
  return index === undefined ? rest : { ...rest, secondary: index };
}

const resetRoles = (roles: RoleChoice): RoleChoice => withRole(withRole(roles, 'accent', undefined), 'secondary', undefined);

function adjustedNote(role: Role, shown: RoleColors): string {
  return role === 'accent'
    ? `Adjusted for contrast: the banner uses ${shown.fill} and headings ${shown.text} instead of ${shown.swatch}.`
    : `Adjusted for contrast: rules use ${shown.fill} and banner links ${shown.text} instead of ${shown.swatch}.`;
}
