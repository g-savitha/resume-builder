import { useId, useState } from 'react';
import type { BrandCandidate } from '@/brand';
import type { PendingChoice } from './VariantsPanel';

/**
 * "Which company did you mean?": shown after a lookup whose name matched no company exactly. The best guess is
 * already applied; picking another re-looks the variant up by that company's domain.
 */
export function CompanyChoice(props: {
  readonly choice: PendingChoice;
  readonly onPick: (c: BrandCandidate) => void;
  readonly onDismiss: () => void;
}) {
  const { choice } = props;
  const headingId = useId();
  const name = useId();
  const [first] = choice.candidates;
  const [picked, setPicked] = useState(first?.domain ?? '');
  const selected = choice.candidates.find((c) => c.domain === picked);
  return (
    <section className="card" aria-labelledby={headingId} data-testid="company-choice">
      <h2 id={headingId}>Which {choice.name}?</h2>
      <p className="field-hint">
        “{choice.name}” matches more than one company. The first one is applied; pick another if it’s wrong.
      </p>
      <fieldset className="theme-picker">
        <legend>Company for the {choice.name} variant</legend>
        {choice.candidates.map((c) => {
          const id = `${name}-${c.domain}`;
          return (
            <div key={c.domain} className={`variant-row${picked === c.domain ? ' active' : ''}`}>
              <input type="radio" id={id} name={name} checked={picked === c.domain} onChange={() => { setPicked(c.domain); }} />
              <label htmlFor={id}>
                <span className="name">{c.name}</span>
                <span className="kind">{c.domain}</span>
              </label>
            </div>
          );
        })}
      </fieldset>
      <div className="row-actions">
        <button type="button" className="btn btn-primary" disabled={!selected || selected.domain === first?.domain} onClick={() => {
            if (selected) props.onPick(selected);
          }}>
          Use this company
        </button>
        <button type="button" className="btn" onClick={props.onDismiss}>
          Keep {first?.name ?? 'the first match'}
        </button>
      </div>
    </section>
  );
}
