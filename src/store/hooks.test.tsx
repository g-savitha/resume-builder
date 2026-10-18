import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildDocument } from '@/testing';
import type { ItemId } from '@/domain';
import { createEditorStore, EditorStoreProvider, useItemField } from '.';

describe('useItemField', () => {
  it('re-renders only the subscribers of the field that changed (per-field selectors)', () => {
    const { doc, ids } = buildDocument();
    const [exp1, exp2] = ids.items as [ItemId, ItemId];
    const store = createEditorStore({ docs: [doc] });
    const renders = { a: 0, b: 0 };
    function Field({ id, field, counter }: { id: ItemId; field: string; counter: 'a' | 'b' }) {
      const value = useItemField(id, field);
      renders[counter] += 1;
      return <span>{typeof value === "string" ? value : ""}</span>;
    }
    const { getByText } = render(
      <EditorStoreProvider store={store}>
        <Field id={exp1} field="role" counter="a" />
        <Field id={exp2} field="role" counter="b" />
      </EditorStoreProvider>,
    );
    const before = { ...renders };
    act(() => {
      store.dispatch(doc.id, { type: 'item/set', itemId: exp1, field: 'role', value: 'Principal' });
    });
    expect(getByText('Principal')).toBeInTheDocument();
    expect(renders.a).toBe(before.a + 1);
    expect(renders.b).toBe(before.b);
  });
});
