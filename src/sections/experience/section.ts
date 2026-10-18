import { defineSection, entry, f } from '../kit';

export default defineSection({
  defaultLabel: 'Experience',
  defaultIcon: 'briefcase',
  cardinality: 'many',
  shape: 'entries',
  item: {
    role: f.text('Role', { required: true, placeholder: 'Lead Frontend Engineer' }),
    company: f.text('Company', { placeholder: 'Acme Corp' }),
    location: f.text('Location', { placeholder: 'Hyderabad, India' }),
    dates: f.dateRange('Dates'),
    url: f.url('Company website'),
    body: f.rich('Highlights', { placeholder: '- Shipped …\n- Led …' }),
    tags: f.tags('Technologies', { placeholder: 'React, TypeScript' }),
  },
  project: (it) =>
    entry({ title: it.role, subtitle: it.company, place: it.location, dates: it.dates, url: it.url, tags: it.tags, body: it.body }),
});
