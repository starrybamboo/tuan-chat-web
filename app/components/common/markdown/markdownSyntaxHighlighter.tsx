function normalizeMarkdownCodeLanguage(language: string): string | null {
  const normalized = language.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalized;
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

  return (
    <code
      {...rest}
      className={className}
      data-language={normalizedLanguage ?? undefined}
    >
      {children}
    </code>
  );
}
