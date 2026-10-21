// render: the paginated resume (the PDF's DOM). Builds flow blocks from a ResumeView and a ResolvedTheme,
// measures them in the DOM, and draws the engine's pages with the primitives.
export { ResumePreview, type PaginationState, type ResumePreviewProps } from './ResumePreview';
export { buildFlow, type BlockData, type RenderBlock } from './flow';
