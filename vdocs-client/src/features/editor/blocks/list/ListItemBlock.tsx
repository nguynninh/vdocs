// List item rendering lives in react/renderer/TextBlockView.tsx: it must share one
// component instance with every other text block type so that converting a
// block's type (markdown shortcut / slash menu) doesn't remount the
// contentEditable node and drop focus. See TextBlockView for details.
export function ListItemBlock() {
  return null;
}
