import { defineSection, entry, f } from '../kit';

export default defineSection({
  defaultLabel: 'Education',
  defaultIcon: 'graduationCap',
  cardinality: 'many',
  shape: 'entries',
  item: {
    degree: f.text('Degree', { required: true, placeholder: 'B.Tech, Computer Science' }),
    school: f.text('School', { placeholder: 'University name' }),
    location: f.text('Location'),
    dates: f.dateRange('Dates'),
    body: f.rich('Details'),
  },
  project: (it) => entry({ title: it.degree, subtitle: it.school, place: it.location, dates: it.dates, body: it.body }),
});
