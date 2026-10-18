import { useId, useState } from 'react';
import { fallbackProfile } from '@/brand';
import { newId, type VariantId } from '@/domain';
import { Icon } from '@/icons';
import { useAnnounce, useDispatch, useVariant, useVariantOrder } from '@/store';
import { useEditorScope } from '../context';
import { ConfirmDelete } from '../content/ConfirmDelete';

/** Variants: one per target company. Content is shared; each variant has its own hide/show state. */
export function VariantsPanel() {
  const { resumeId, variantId: active } = useEditorScope();
  const order = useVariantOrder(resumeId);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const inputId = useId();
  const [company, setCompany] = useState('');

  const create = () => {
    const name = company.trim();
    if (!name) return;
    const variantId = newId<VariantId>();
    dispatch(resumeId, {
      type: 'variant/create',
      variantId,
      target: fallbackProfile({ name, now: Date.now() }),
      base: { kind: 'auto' },
      copyFrom: active,
    });
    dispatch(resumeId, { type: 'variant/select', variantId });
    setCompany('');
    announce(`Created and switched to the ${name} variant.`);
  };

  return (
    <div className="panel-stack">
      <section className="card" aria-labelledby="variants-h">
        <div className="card-head">
          <h2 id="variants-h">Variants</h2>
        </div>
        <fieldset className="variant-list">
          <legend className="sr-only">Active variant</legend>
          {order.map((id) => (
            <VariantRow key={id} variantId={id} active={id === active} canDelete={order.length > 1} />
          ))}
        </fieldset>
      </section>
      <section className="card" aria-labelledby="new-variant-h">
        <div className="card-head">
          <h2 id="new-variant-h">New variant</h2>
        </div>
        <form
          className="fields"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <div className="field">
            <label htmlFor={inputId}>Company you’re applying to</label>
            <input
              id={inputId}
              className="input"
              value={company}
              placeholder="Microsoft"
              autoComplete="organization"
              aria-describedby={`${inputId}-hint`}
              onChange={(e) => {
                setCompany(e.target.value);
              }}
            />
            <p id={`${inputId}-hint`} className="field-hint">
              Copies the current variant’s hide/show choices. Logo colors arrive in milestone 4; until then each variant
              gets a placeholder palette.
            </p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!company.trim()}>
            <Icon name="plus" /> Create variant
          </button>
        </form>
      </section>
    </div>
  );
}

function VariantRow({ variantId, active, canDelete }: { readonly variantId: VariantId; readonly active: boolean; readonly canDelete: boolean }) {
  const { resumeId } = useEditorScope();
  const variant = useVariant(resumeId, variantId);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const id = useId();
  if (!variant) return null;
  return (
    <div className={`variant-row${active ? ' active' : ''}`}>
      <input
        type="radio"
        id={id}
        name="active-variant"
        checked={active}
        onChange={() => {
          dispatch(resumeId, { type: 'variant/select', variantId });
          announce(`Switched to the ${variant.label} variant.`);
        }}
      />
      <label htmlFor={id}>
        <span className="name">{variant.label}</span>
        <span className="kind">
          {variant.hidden.length} hidden · {variant.brand.palette.source === 'fallback' ? 'placeholder palette' : 'logo palette'}
        </span>
      </label>
      {canDelete ? (
        <ConfirmDelete
          compact
          what={`${variant.label} variant`}
          onConfirm={() => {
            dispatch(resumeId, { type: 'variant/delete', variantId });
            announce(`Deleted the ${variant.label} variant.`);
          }}
        />
      ) : null}
    </div>
  );
}
