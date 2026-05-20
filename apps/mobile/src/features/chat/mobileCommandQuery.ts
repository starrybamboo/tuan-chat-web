export function getCommandQuery(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed)
    return null;
  if (!(trimmed.startsWith(".") || trimmed.startsWith("。") || trimmed.startsWith("/")))
    return null;
  const afterPrefix = trimmed.slice(1);
  if (!afterPrefix)
    return "";
  const secondChar = afterPrefix.charAt(0);
  if (secondChar === "." || secondChar === "。" || secondChar === "/")
    return null;
  if (afterPrefix.includes(" "))
    return null;
  return afterPrefix;
}
