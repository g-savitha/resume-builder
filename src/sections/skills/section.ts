import { defineSection, f, tagGroup } from '../kit';

export default defineSection({
  defaultLabel: 'Skills',
  defaultIcon: 'star',
  cardinality: 'many',
  shape: 'tags',
  titleField: 'group',
  item: {
    group: f.text('Group', { placeholder: 'Frontend' }),
    skills: f.tags('Skills', { withLevel: true, placeholder: 'React, TypeScript, Redux' }),
  },
  project: (it) => tagGroup(it.group, it.skills),
});
