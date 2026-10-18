import { defineSection, entry, f } from '../kit';

export default defineSection({
  defaultLabel: 'Volunteering',
  defaultIcon: 'heartHandshake',
  cardinality: 'many',
  shape: 'entries',
  item: {
    org: f.text('Organisation', { required: true }),
    role: f.text('Role'),
    dates: f.dateRange('Dates'),
    body: f.rich('Highlights'),
  },
  project: (it) => entry({ title: it.org, subtitle: it.role, dates: it.dates, body: it.body }),
});
