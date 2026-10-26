import type { CenterpieceId, Variant, VocabSetId } from '@/domain';

/**
 * Section-heading words per persona vocab set, by section kind. A fixed registry written by us: the persona only
 * picks a set id. A section the user renamed keeps its own title; kinds a set leaves out keep the default label.
 */
export const VOCAB_WORDS: Readonly<Record<VocabSetId, Readonly<Record<string, string>>>> = {
  standard: {},
  builder: { experience: 'What I’ve built', projects: 'Things I’ve shipped', skills: 'Toolbox', achievements: 'Wins' },
  impact: { experience: 'Track record', projects: 'Engagements', skills: 'Core strengths', achievements: 'Results' },
  story: { experience: 'Career highlights', projects: 'Productions', skills: 'Craft', achievements: 'Recognition' },
  care: { experience: 'Experience', skills: 'Skills and care', certifications: 'Licences and certifications', volunteering: 'Community' },
};

/** The heading words and centerpiece a variant's persona chooses (nothing without a persona). */
export function personaChoices(variant: Variant): { readonly headings: Readonly<Record<string, string>>; readonly centerpiece: CenterpieceId } {
  const p = variant.persona;
  return p ? { headings: VOCAB_WORDS[p.vocab], centerpiece: p.centerpiece } : { headings: VOCAB_WORDS.standard, centerpiece: 'none' };
}
