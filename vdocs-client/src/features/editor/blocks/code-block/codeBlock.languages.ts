export interface CodeLanguageOption {
  value: string;
  label: string;
}

export const CODE_LANGUAGES: CodeLanguageOption[] = [
  { value: "plaintext", label: "Plain Text" },
  { value: "java", label: "Java" },
  { value: "sql", label: "SQL" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "kotlin", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "bash", label: "Bash" },
  { value: "mermaid", label: "Mermaid" },
];

export const DEFAULT_CODE_LANGUAGE = "plaintext";

export function getCodeLanguageLabel(value: string): string {
  return CODE_LANGUAGES.find((language) => language.value === value)?.label ?? value;
}
