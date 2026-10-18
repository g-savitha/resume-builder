import type { ComponentType } from 'react';

/** Every registry entry renders an SVG at `size` (CSS length or px number) using currentColor. */
export type IconComponent = ComponentType<{ size: string }>;
