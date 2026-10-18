import { defineSection, entry, f } from '../kit';

/** User-defined section. Milestone 1 offers the 'entries' shape; other shapes arrive with the theme engine. */
export default defineSection({
  defaultLabel: 'Custom section',
  defaultIcon: 'layers',
  cardinality: 'many',
  shape: 'entries',
  item: {
    title: f.text('Title', { required: true }),
    subtitle: f.text('Subtitle'),
    place: f.text('Place'),
    dates: f.dateRange('Dates'),
    url: f.url('Link'),
    body: f.rich('Details'),
    tags: f.tags('Tags'),
  },
  project: (it) =>
    entry({ title: it.title, subtitle: it.subtitle, place: it.place, dates: it.dates, url: it.url, tags: it.tags, body: it.body }),
});
