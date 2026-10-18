import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabDef<T extends string> {
  readonly id: T;
  readonly label: string;
}

/** WAI-ARIA tabs with automatic activation: arrows/Home/End move between tabs, Tab enters the panel. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
  children,
}: {
  readonly tabs: readonly TabDef<T>[];
  readonly active: T;
  readonly onChange: (id: T) => void;
  readonly label: string;
  readonly children: ReactNode;
}) {
  const base = useId();
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === active);
    const target =
      e.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length]
      : e.key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length]
      : e.key === 'Home' ? tabs[0]
      : e.key === 'End' ? tabs.at(-1)
      : undefined;
    if (!target) return;
    e.preventDefault();
    onChange(target.id);
    refs.current.get(target.id)?.focus();
  };
  return (
    <>
      <div className="tabs" role="tablist" aria-label={label}>
        {tabs.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              if (el) refs.current.set(t.id, el);
              else refs.current.delete(t.id);
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={t.id === active}
            aria-controls={`${base}-panel`}
            tabIndex={t.id === active ? 0 : -1}
            onKeyDown={onKeyDown}
            onClick={() => {
              onChange(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${active}`}>
        {children}
      </div>
    </>
  );
}
