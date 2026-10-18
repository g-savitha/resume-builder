import { defineSection, entry, f } from '../kit';

export default defineSection({
  defaultLabel: 'Certifications',
  defaultIcon: 'badgeCheck',
  cardinality: 'many',
  shape: 'entries',
  item: {
    name: f.text('Certification', { required: true }),
    issuer: f.text('Issuer'),
    dates: f.dateRange('Issued'),
    url: f.url('Credential link'),
  },
  project: (it) => entry({ title: it.name, subtitle: it.issuer, dates: it.dates, url: it.url }),
});
