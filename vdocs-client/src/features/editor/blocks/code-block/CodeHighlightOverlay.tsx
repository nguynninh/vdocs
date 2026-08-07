"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

const LANGUAGE_ALIASES: Record<string, string> = {
  plaintext: "text",
  csharp: "csharp",
  cpp: "cpp",
  html: "markup",
};

export interface CodeHighlightOverlayProps {
  code: string;
  language: string;
}

const codeTagProps = {
  style: {
    fontFamily: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
  },
};

export function CodeHighlightOverlay({ code, language }: CodeHighlightOverlayProps) {
  const prismLanguage = LANGUAGE_ALIASES[language] ?? language;

  return (
    <SyntaxHighlighter
      language={prismLanguage}
      style={oneLight}
      PreTag="div"
      CodeTag="span"
      codeTagProps={codeTagProps}
      customStyle={{
        margin: 0,
        padding: 0,
        background: "transparent",
        overflow: "visible",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {code.length > 0 ? code : " "}
    </SyntaxHighlighter>
  );
}
