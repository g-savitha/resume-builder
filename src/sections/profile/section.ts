import { defineSection, f } from '../kit';

export default defineSection({
  defaultLabel: 'Profile',
  defaultIcon: 'user',
  cardinality: 'single',
  shape: 'identity',
  titleField: 'name',
  item: {
    name: f.text('Full name', { required: true, placeholder: 'Ada Lovelace' }),
    headline: f.text('Headline', { placeholder: 'Senior Frontend Engineer' }),
    contacts: f.contacts('Contact details'),
    photo: f.image('Photo'),
  },
  project: (it) => ({
    name: it.name.trim(),
    ...(it.headline.trim() ? { headline: it.headline.trim() } : {}),
    ...(it.photo ? { photo: it.photo } : {}),
    contacts: it.contacts.filter((c) => c.text.trim() !== ''),
  }),
});
