import { defineSection, entry, f } from '../kit';

export default defineSection({
  defaultLabel: 'Achievements',
  defaultIcon: 'award',
  cardinality: 'many',
  shape: 'entries',
  item: {
    title: f.text('Achievement', { required: true }),
    awardedBy: f.text('Awarded by'),
    dates: f.dateRange('Date'),
    body: f.rich('Details'),
  },
  project: (it) => entry({ title: it.title, subtitle: it.awardedBy, dates: it.dates, body: it.body }),
});
