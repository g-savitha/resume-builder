import { defineSection, f, tagGroup } from '../kit';

export default defineSection({
  defaultLabel: 'Languages',
  defaultIcon: 'languages',
  cardinality: 'single',
  shape: 'tags',
  item: {
    languages: f.tags('Languages', { withLevel: true, placeholder: 'English, Telugu, Hindi' }),
  },
  project: (it) => tagGroup('', it.languages),
});
