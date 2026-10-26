import { useId, type ReactNode } from 'react';
import type { Customization, CustomizationPatch } from '@/domain';
import { useAnnounce, useDispatch, useVariant } from '@/store';
import { FONT_PAIR_KEYS, FONT_PAIRS, fontPairId } from '@/themes';
import { useEditorScope } from '../context';

type Options<T> = readonly (readonly [value: T, label: string])[];

const FONT_SCALES: Options<Customization['fontScale']> = [
  [0.9, 'Smaller (90%)'],
  [0.95, 'Small (95%)'],
  [1, 'Normal'],
  [1.05, 'Large (105%)'],
  [1.1, 'Larger (110%)'],
];
const LINE_HEIGHTS: Options<Customization['lineHeight']> = [
  ['tight', 'Tight'],
  ['normal', 'Normal'],
  ['relaxed', 'Relaxed'],
];
const GAPS: Options<Customization['sectionGap']> = [
  ['compact', 'Compact'],
  ['normal', 'Normal'],
  ['airy', 'Airy'],
];
const PAGES: Options<Customization['page']> = [
  ['A4', 'A4 (210 × 297 mm)'],
  ['Letter', 'US Letter (8.5 × 11 in)'],
];
const MARGINS: Options<Customization['marginsMm']> = [
  [10, '10 mm'],
  [15, '15 mm'],
  [20, '20 mm'],
  [25, '25 mm'],
];
const ICON_STYLES: Options<Customization['icons']['style']> = [
  ['line', 'Line'],
  ['badge', 'Badge (filled circle)'],
];
const THEME_FONT = 'theme';

/**
 * Customize (M5): fonts, spacing, page size, icons and the 7:1 text boost for the active variant. Every control is
 * a native select or checkbox, so it works from the keyboard and with a screen reader without extra wiring.
 */
export function CustomizeCard() {
  const { resumeId, variantId, variantLabel } = useEditorScope();
  const variant = useVariant(resumeId, variantId);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  if (!variant) return null;
  const c = variant.customization;
  const patch = (p: CustomizationPatch, what: string) => {
    dispatch(resumeId, { type: 'variant/customize', variantId, patch: p });
    announce(`${what} updated for the ${variantLabel} variant.`);
  };
  const icons = (p: Partial<Customization['icons']>, what: string) => {
    patch({ icons: { ...c.icons, ...p } }, what);
  };
  return (
    <section className="card panel-stack" aria-labelledby="customize-h" data-testid="customize-card">
      <h2 id="customize-h">Customize</h2>
      <div className="fields">
        <Select
          label="Font"
          value={String(c.fontPair ?? THEME_FONT)}
          options={[[THEME_FONT, 'Theme default'], ...FONT_PAIR_KEYS.map((k): readonly [string, string] => [k, FONT_PAIRS[k].label])]}
          onPick={(v) => {
            const key = FONT_PAIR_KEYS.find((k) => k === v);
            patch({ fontPair: key ? fontPairId(key) : null }, 'Font');
          }}
        />
        <Select label="Text size" value={c.fontScale} options={FONT_SCALES} onPick={(v) => { patch({ fontScale: v }, 'Text size'); }} />
        <Select label="Line spacing" value={c.lineHeight} options={LINE_HEIGHTS} onPick={(v) => { patch({ lineHeight: v }, 'Line spacing'); }} />
        <Select label="Section spacing" value={c.sectionGap} options={GAPS} onPick={(v) => { patch({ sectionGap: v }, 'Section spacing'); }} />
        <Select label="Page size" value={c.page} options={PAGES} onPick={(v) => { patch({ page: v }, 'Page size'); }} />
        <Select label="Margins" value={c.marginsMm} options={MARGINS} onPick={(v) => { patch({ marginsMm: v }, 'Margins'); }} />
      </div>
      <fieldset className="panel-stack" data-testid="icon-options">
        <legend>Icons</legend>
        <Check label="Contact icons" checked={c.icons.contact} onToggle={(on) => { icons({ contact: on }, 'Contact icons'); }} />
        <Check label="Section heading icons" checked={c.icons.headings} onToggle={(on) => { icons({ headings: on }, 'Heading icons'); }} />
        <Check label="Brand-colored bullets" checked={c.icons.bullets} onToggle={(on) => { icons({ bullets: on }, 'Bullets'); }} />
        <Select label="Icon style" value={c.icons.style} options={ICON_STYLES} onPick={(v) => { icons({ style: v }, 'Icon style'); }} />
      </fieldset>
      <Check
        label="Extra-high text contrast (7:1)"
        hint="Darkens body text to WCAG AAA where the background allows."
        checked={variant.roles.boost === 1}
        onToggle={(on) => {
          dispatch(resumeId, { type: 'variant/setRoles', variantId, roles: { ...variant.roles, boost: on ? 1 : 0 } });
          announce(`High-contrast text ${on ? 'on' : 'off'} for the ${variantLabel} variant.`);
        }}
      />
    </section>
  );
}

function Select<T extends string | number>(props: {
  readonly label: string;
  readonly value: T;
  readonly options: Options<T>;
  readonly onPick: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{props.label}</label>
      <select
        id={id}
        className="input select"
        value={String(props.value)}
        onChange={(e) => {
          const hit = props.options.find(([v]) => String(v) === e.target.value);
          if (hit) props.onPick(hit[0]);
        }}
      >
        {props.options.map(([v, label]) => (
          <option key={String(v)} value={String(v)}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Check(props: { readonly label: string; readonly checked: boolean; readonly onToggle: (on: boolean) => void; readonly hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="check-row">
      <input
        type="checkbox"
        id={id}
        checked={props.checked}
        onChange={(e) => {
          props.onToggle(e.target.checked);
        }}
      />
      <label htmlFor={id}>
        {props.label}
        {props.hint ? <span className="field-hint"> {props.hint}</span> : null}
      </label>
    </div>
  );
}
