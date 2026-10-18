import { defineSection, entry, f } from '../kit';

export default defineSection({
  defaultLabel: 'Projects',
  defaultIcon: 'code',
  cardinality: 'many',
  shape: 'entries',
  item: {
    name: f.text('Project name', { required: true }),
    role: f.text('Your role'),
    url: f.url('Link', { placeholder: 'github.com/you/project' }),
    dates: f.dateRange('Dates'),
    body: f.rich('Description'),
    tags: f.tags('Stack', { placeholder: 'React, Zustand' }),
  },
  project: (it) => entry({ title: it.name, subtitle: it.role, url: it.url, dates: it.dates, tags: it.tags, body: it.body }),
});
