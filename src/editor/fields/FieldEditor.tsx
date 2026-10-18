import { useId, useState, type ChangeEvent } from 'react';
import {
  CONTACT_KINDS,
  deepEqual,
  formatRichText,
  parseDataUrl,
  parsePartialDate,
  parseRichText,
  parseSafeUrl,
  type ContactKind,
  type DateRange,
  type FieldValue,
  type ItemId,
} from '@/domain';
import { Icon } from '@/icons';
import { readField, type FieldSpec } from '@/sections';
import { useDispatch, useItemField } from '@/store';
import { useEditorScope } from '../context';
import { CONTACT_LABEL, makeContact } from './contact';
import { formatTagList, parseTagList } from './tags';
import { useDraft } from './useDraft';

interface FieldProps<K extends FieldSpec['k']> {
  readonly itemId: ItemId;
  readonly field: string;
  readonly spec: Extract<FieldSpec, { k: K }>;
}

function useSetField(itemId: ItemId, field: string) {
  const dispatch = useDispatch();
  const { resumeId } = useEditorScope();
  return (value: FieldValue) => {
    dispatch(resumeId, { type: 'item/set', itemId, field, value });
  };
}

/** Renders the editor control for one field, chosen by its spec. Forms are generated from section definitions. */
export function FieldEditor({ itemId, field, spec }: { readonly itemId: ItemId; readonly field: string; readonly spec: FieldSpec }) {
  switch (spec.k) {
    case 'text':
      return <TextField itemId={itemId} field={field} spec={spec} />;
    case 'url':
      return <UrlField itemId={itemId} field={field} spec={spec} />;
    case 'rich':
      return <RichField itemId={itemId} field={field} spec={spec} />;
    case 'dateRange':
      return <DateRangeField itemId={itemId} field={field} spec={spec} />;
    case 'tags':
      return <TagsField itemId={itemId} field={field} spec={spec} />;
    case 'contacts':
      return <ContactsField itemId={itemId} field={field} spec={spec} />;
    case 'image':
      return <ImageField itemId={itemId} field={field} spec={spec} />;
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}

function TextField({ itemId, field, spec }: FieldProps<'text'>) {
  const id = useId();
  const value = readField(spec, useItemField(itemId, field));
  const set = useSetField(itemId, field);
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    set(e.target.value);
  };
  return (
    <div className="field">
      <label htmlFor={id}>
        {spec.label}
        {spec.required ? <span className="req"> (required)</span> : null}
      </label>
      {spec.multiline ? (
        <textarea id={id} className="input" value={value} onChange={onChange} placeholder={spec.placeholder} rows={3} />
      ) : (
        <input
          id={id}
          className="input"
          value={value}
          onChange={onChange}
          placeholder={spec.placeholder}
          required={spec.required}
          data-field={field}
        />
      )}
    </div>
  );
}

function UrlField({ itemId, field, spec }: FieldProps<'url'>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const value = readField(spec, useItemField(itemId, field));
  const set = useSetField(itemId, field);
  const [touched, setTouched] = useState(false);
  const invalid = touched && value.trim() !== '' && parseSafeUrl(value) === null;
  return (
    <div className="field">
      <label htmlFor={id}>{spec.label}</label>
      <input
        id={id}
        className="input"
        inputMode="url"
        autoComplete="url"
        value={value}
        placeholder={spec.placeholder ?? 'example.com'}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? hintId : undefined}
        onChange={(e) => {
          set(e.target.value);
        }}
        onBlur={() => {
          setTouched(true);
        }}
      />
      {invalid ? (
        <p id={hintId} className="field-error">
          <Icon name="alert" /> Use a web address like example.com or https://example.com. It won’t be linked until then.
        </p>
      ) : null}
    </div>
  );
}

function RichField({ itemId, field, spec }: FieldProps<'rich'>) {
  const id = useId();
  const stored = readField(spec, useItemField(itemId, field));
  const set = useSetField(itemId, field);
  const [draft, setDraft] = useDraft(stored, formatRichText, (d, s) => deepEqual(parseRichText(d), s));
  return (
    <div className="field">
      <label htmlFor={id}>{spec.label}</label>
      <textarea
        id={id}
        className="input rich"
        value={draft}
        placeholder={spec.placeholder}
        rows={4}
        aria-describedby={`${id}-hint`}
        data-field={field}
        onChange={(e) => {
          setDraft(e.target.value);
          set(parseRichText(e.target.value));
        }}
      />
      <p id={`${id}-hint`} className="field-hint">
        Start a line with “- ” for a bullet. **bold**, *italic*, [link](https://…)
      </p>
    </div>
  );
}

function DateRangeField({ itemId, field, spec }: FieldProps<'dateRange'>) {
  const id = useId();
  const stored = readField(spec, useItemField(itemId, field));
  const set = useSetField(itemId, field);
  const present = stored.end === 'present';
  const [start, setStart] = useDraft(stored.start, (v) => v ?? '', (d, s) => (parsePartialDate(d) ?? undefined) === s);
  const [end, setEnd] = useDraft(
    stored.end === 'present' ? undefined : stored.end,
    (v) => v ?? '',
    (d, s) => (parsePartialDate(d) ?? undefined) === s,
  );
  const [touched, setTouched] = useState<{ start: boolean; end: boolean }>({ start: false, end: false });

  const commit = (next: { start: string; end: string; present: boolean }) => {
    const s = parsePartialDate(next.start);
    const e = parsePartialDate(next.end);
    const startOk = next.start.trim() === '' || s !== null;
    const endOk = next.present || next.end.trim() === '' || e !== null;
    if (!startOk || !endOk) return;
    const range: DateRange = {
      ...(s ? { start: s } : {}),
      ...(next.present ? { end: 'present' as const } : e ? { end: e } : {}),
    };
    set(range);
  };
  const startInvalid = touched.start && start.trim() !== '' && parsePartialDate(start) === null;
  const endInvalid = !present && touched.end && end.trim() !== '' && parsePartialDate(end) === null;

  return (
    <fieldset className="field date-range">
      <legend>{spec.label}</legend>
      <div className="grid2">
        <div>
          <label htmlFor={`${id}-start`} className="sub-label">
            Start
          </label>
          <input
            id={`${id}-start`}
            className="input"
            inputMode="numeric"
            placeholder="YYYY-MM"
            value={start}
            aria-invalid={startInvalid || undefined}
            aria-describedby={startInvalid ? `${id}-err` : undefined}
            onChange={(e) => {
              setStart(e.target.value);
              commit({ start: e.target.value, end, present });
            }}
            onBlur={() => {
              setTouched((t) => ({ ...t, start: true }));
            }}
          />
        </div>
        <div>
          <label htmlFor={`${id}-end`} className="sub-label">
            End
          </label>
          <input
            id={`${id}-end`}
            className="input"
            inputMode="numeric"
            placeholder={present ? 'Present' : 'YYYY-MM'}
            value={present ? '' : end}
            disabled={present}
            aria-invalid={endInvalid || undefined}
            aria-describedby={endInvalid ? `${id}-err` : undefined}
            onChange={(e) => {
              setEnd(e.target.value);
              commit({ start, end: e.target.value, present });
            }}
            onBlur={() => {
              setTouched((t) => ({ ...t, end: true }));
            }}
          />
        </div>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={present}
          onChange={(e) => {
            commit({ start, end, present: e.target.checked });
          }}
        />
        Current (no end date)
      </label>
      {startInvalid || endInvalid ? (
        <p id={`${id}-err`} className="field-error">
          <Icon name="alert" /> Dates use YYYY or YYYY-MM, for example 2021-03.
        </p>
      ) : null}
    </fieldset>
  );
}

function TagsField({ itemId, field, spec }: FieldProps<'tags'>) {
  const id = useId();
  const stored = readField(spec, useItemField(itemId, field));
  const set = useSetField(itemId, field);
  const [draft, setDraft] = useDraft(stored, formatTagList, (d, s) => deepEqual(parseTagList(d, s), s));
  return (
    <div className="field">
      <label htmlFor={id}>{spec.label}</label>
      <input
        id={id}
        className="input"
        value={draft}
        placeholder={spec.placeholder}
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          setDraft(e.target.value);
          set(parseTagList(e.target.value, stored));
        }}
      />
      <p id={`${id}-hint`} className="field-hint">
        Separate with commas.
      </p>
    </div>
  );
}

function ContactsField({ itemId, field, spec }: FieldProps<'contacts'>) {
  const id = useId();
  const contacts = readField(spec, useItemField(itemId, field));
  const set = useSetField(itemId, field);
  const update = (index: number, kind: ContactKind, text: string) => {
    set(contacts.map((c, i) => (i === index ? makeContact(kind, text) : c)));
  };
  return (
    <fieldset className="field contacts">
      <legend>{spec.label}</legend>
      <ul className="contact-list">
        {contacts.map((c, i) => (
          // Contacts have no ids; index keys are stable here because rows are only appended or removed explicitly.
          <li key={i} className="contact-row">
            <label htmlFor={`${id}-kind-${i}`} className="sr-only">
              Contact {i + 1} type
            </label>
            <select
              id={`${id}-kind-${i}`}
              className="input select"
              value={c.kind}
              onChange={(e) => {
                const kind = CONTACT_KINDS.find((k) => k === e.target.value) ?? 'other';
                update(i, kind, c.text);
              }}
            >
              {CONTACT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {CONTACT_LABEL[k]}
                </option>
              ))}
            </select>
            <label htmlFor={`${id}-text-${i}`} className="sr-only">
              {CONTACT_LABEL[c.kind]}
            </label>
            <input
              id={`${id}-text-${i}`}
              className="input"
              value={c.text}
              onChange={(e) => {
                update(i, c.kind, e.target.value);
              }}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${CONTACT_LABEL[c.kind]} ${c.text}`.trim()}
              onClick={() => {
                set(contacts.filter((_, j) => j !== i));
              }}
            >
              <Icon name="close" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => {
          set([...contacts, makeContact('email', '')]);
        }}
      >
        <Icon name="plus" /> Add contact
      </button>
    </fieldset>
  );
}

const MAX_PHOTO_BYTES = 1_000_000;

function ImageField({ itemId, field, spec }: FieldProps<'image'>) {
  const id = useId();
  const value = readField(spec, useItemField(itemId, field));
  const set = useSetField(itemId, field);
  const [error, setError] = useState<string | null>(null);
  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Choose an image under 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? parseDataUrl(reader.result) : null;
      if (url) {
        setError(null);
        set(url);
      } else setError('Use a PNG, JPEG, WebP or GIF image.');
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="field">
      <label htmlFor={id}>{spec.label}</label>
      <div className="image-field">
        {value ? <img src={value} alt="Current headshot" className="thumb" /> : null}
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="file"
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => {
            onFile(e.target.files?.[0]);
          }}
        />
        {value ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              set(null);
            }}
          >
            Remove photo
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-err`} className="field-error">
          <Icon name="alert" /> {error}
        </p>
      ) : null}
    </div>
  );
}
