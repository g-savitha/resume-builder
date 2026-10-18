import { defineSection, f } from '../kit';

export default defineSection({
  defaultLabel: 'Summary',
  defaultIcon: 'fileText',
  cardinality: 'single',
  shape: 'prose',
  item: {
    body: f.rich('Summary', { placeholder: 'Two or three sentences about what you do best.' }),
  },
  project: (it) => it.body,
});
