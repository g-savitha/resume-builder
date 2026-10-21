import type { ArchetypeId } from '@/domain';
import type { ThemeBase } from '../types';
import { atsPlain } from './ats-plain';
import { classic } from './classic';

/** The archetypes implemented so far. `sidebar` and `app-ui` arrive in M5 (multi-region layouts). */
export const ARCHETYPES = { 'ats-plain': atsPlain, classic } as const satisfies Partial<Record<ArchetypeId, ThemeBase>>;
export type ImplementedArchetype = keyof typeof ARCHETYPES;

/** Until M5 every unimplemented archetype, every preset and 'auto' render as classic. */
export const FALLBACK_ARCHETYPE: ImplementedArchetype = 'classic';
