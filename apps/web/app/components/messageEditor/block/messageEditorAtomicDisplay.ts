/**
 * 文档编辑器里的通用消息块应尽量像普通文档段落，而不是聊天卡片。
 */
export function resolveMessageEditorGenericBlockText(input: {
  content?: unknown;
  typeLabel: string;
}) {
  const content = typeof input.content === "string" ? input.content.trim() : "";
  return content || `[${input.typeLabel}]`;
}
