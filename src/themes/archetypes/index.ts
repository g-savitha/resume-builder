import type { ArchetypeId } from '@/domain';
import type { ThemeBase } from '../types';
import { appUi } from './app-ui';
import { atsPlain } from './ats-plain';
import { classic } from './classic';
import { sidebar } from './sidebar';

/** Every archetype in the contract (M5 completes the set). */
export const ARCHETYPES = { 'ats-plain': atsPlain, classic, sidebar, 'app-ui': appUi } as const satisfies Record<ArchetypeId, ThemeBase>;
export type ImplementedArchetype = keyof typeof ARCHETYPES;

/** 'auto' renders as classic. */
export const FALLBACK_ARCHETYPE: ImplementedArchetype = 'classic';
