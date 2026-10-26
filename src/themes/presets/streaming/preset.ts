import { definePreset } from '../kit';
import { EpisodeHead } from './EpisodeHead';
import { TitleCard } from './TitleCard';

/** Classic's single column, with a bespoke title card and episode-numbered roles; skills as chips. */
export default definePreset({
  extends: 'classic',
  override: {
    blocks: { identity: 'bespoke', entries: 'bespoke', tags: 'chips', prose: 'plain' },
    typography: {
      stack: "'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', sans-serif",
      scale: { name: 28, h2: 12.5, h3: 11, body: 10, small: 9 },
      headingCase: 'none',
    },
    vocab: { present: 'Now streaming' },
  },
  bespoke: { identity: TitleCard, entryHead: EpisodeHead },
});
