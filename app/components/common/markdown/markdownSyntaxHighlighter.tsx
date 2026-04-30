import type { ComponentType } from "react";

// @ts-expect-error missing subpath declarations
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
// @ts-expect-error missing subpath declarations
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
// @ts-expect-error missing subpath declarations
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
// @ts-expect-error missing subpath declarations
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
// @ts-expect-error missing subpath declarations
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
// @ts-expect-error missing subpath declarations
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
// @ts-expect-error missing subpath declarations
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
// @ts-expect-error missing subpath declarations
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
// react-syntax-highlighter does not ship declarations for its ESM subpaths.
// @ts-expect-error missing subpath declarations
import PrismLight from "react-syntax-highlighter/dist/esm/prism-light";

type SyntaxHighlighterComponent = ComponentType<any> & {
  registerLanguage: (name: string, language: unknown) => void;
};

const SyntaxHighlighter = PrismLight as SyntaxHighlighterComponent;

const LANGUAGE_ALIASES: Record<string, string> = {
  cjs: "javascript",
  js: "javascript",
  jsx: "tsx",
  mjs: "javascript",
  ps1: "bash",
  shell: "bash",
  sh: "bash",
  ts: "typescript",
  yaml: "yaml",
  yml: "yaml",
};

const REGISTERED_LANGUAGES = new Set([
  "bash",
  "css",
  "javascript",
  "json",
  "markdown",
  "tsx",
  "typescript",
  "yaml",
]);

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("yaml", yaml);

function normalizeMarkdownCodeLanguage(language: string): string | null {
  const normalized = language.trim().toLowerCase();
  const aliased = LANGUAGE_ALIASES[normalized] ?? normalized;
  return REGISTERED_LANGUAGES.has(aliased) ? aliased : null;
}

export function MarkdownSyntaxHighlighter({
  children,
  className,
  language,
  ...rest
}: {
  children: string;
  className?: string;
  language: string;
}) {
  const normalizedLanguage = normalizeMarkdownCodeLanguage(language);
  if (!normalizedLanguage) {
    return (
      <code {...rest} className={className}>
        {children}
      </code>
    );
  }

  return (
    <SyntaxHighlighter
      {...rest}
      language={normalizedLanguage}
    >
      {children}
    </SyntaxHighlighter>
  );
}
