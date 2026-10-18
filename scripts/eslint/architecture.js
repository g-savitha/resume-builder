// The module dependency arrows from docs/design/module-map.md, enforced by the
// `boundaries/module-imports` lint rule. A module may import only the modules
// listed here, and only through their index.ts (`@/<module>`).
//
// Adding a folder under src/ without adding it here fails lint, on purpose:
// a new module must decide its place in the architecture.
/** @type {Readonly<Record<string, readonly string[]>>} */
export const ARCHITECTURE = {
  // Leaves
  icons: [],
  // domain needs `IconName` (type only) for custom-section icons.
  domain: ['icons'],
  sections: ['domain', 'icons'],
  brand: ['domain'],
  store: ['domain'],
  storage: ['store', 'domain'],
  io: ['domain', 'sections'],
  // Later milestones (declared now so the arrows exist before the code does)
  primitives: ['icons', 'domain'],
  themes: ['domain', 'primitives', 'icons'],
  engine: ['domain'],
  render: ['engine', 'themes', 'primitives', 'domain', 'store', 'sections'],
  editor: ['store', 'domain', 'sections', 'icons', 'brand', 'themes', 'render'],
  app: ['editor', 'store', 'storage', 'domain', 'sections', 'brand', 'render', 'icons'],
  // Shared test helpers (imported only from *.test.ts(x)).
  testing: ['domain', 'sections', 'store', 'brand'],
};

/** Packages that only one module may import (single registries / boundaries). */
export const OWNED_PACKAGES = {
  'lucide-react': 'icons',
  idb: 'storage',
  zustand: 'store',
  valibot: 'storage',
  '@dnd-kit/core': 'editor',
  '@dnd-kit/sortable': 'editor',
  '@dnd-kit/utilities': 'editor',
};
