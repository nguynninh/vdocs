import { useMDXComponents as getDocsMDXComponents } from "nextra-theme-docs";
import type { ComponentPropsWithoutRef, ComponentType } from "react";
import { Markmap } from "./components/Markmap";

const docsComponents = getDocsMDXComponents();
type DocsPreProps = ComponentPropsWithoutRef<"pre"> & {
  "data-filename"?: string;
  "data-language"?: string;
};
const NextraPre = docsComponents.pre as ComponentType<DocsPreProps>;

const LANGUAGE_LABELS: Record<string, string> = {
  java: "Java",
  tsx: "React TSX",
  jsx: "React JSX",
  ts: "TypeScript",
  js: "JavaScript",
  xml: "XML",
};

function getLanguageLabel(language: string) {
  return LANGUAGE_LABELS[language] ?? language;
}

function DocsPre(props: DocsPreProps) {
  const language = props["data-language"];
  const filename = props["data-filename"];

  if (!language || filename) {
    return <NextraPre {...props} />;
  }

  return (
    <div className="docs-code-frame">
      <div className="docs-code-title">{getLanguageLabel(language)}</div>
      <NextraPre {...props} />
    </div>
  );
}

export function useMDXComponents(components: Record<string, unknown> = {}) {
  return {
    ...docsComponents,
    Markmap,
    pre: DocsPre,
    ...components,
  };
}
