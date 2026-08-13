import { useMDXComponents as getDocsMDXComponents } from "nextra-theme-docs";
import { Markmap } from "./components/Markmap";

const docsComponents = getDocsMDXComponents();

export function useMDXComponents(components: Record<string, unknown> = {}) {
  return {
    ...docsComponents,
    Markmap,
    ...components,
  };
}
