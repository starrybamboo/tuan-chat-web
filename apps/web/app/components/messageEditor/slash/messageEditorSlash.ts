import type { MessageEditorInsertableBlockKind } from "../document/messageEditorTransforms";

import { normalizeMessageEditorContent } from "../document/messageEditorTransforms";
import { extractMessageEditorSpeakerCommandMatch } from "../speaker/messageEditorSpeaker";

/**
 * MessageEditor slash 菜单项。
 */
export type MessageEditorSlashMenuItem = {
  description: string;
  keyword: string;
  kind: MessageEditorInsertableBlockKind;
  label: string;
};

/**
 * 当前可见的 MessageEditor slash 菜单状态。
 */
export type MessageEditorSlashMenuState = {
  blockId: string;
  items: MessageEditorSlashMenuItem[];
  slashKey: string;
};

const MESSAGE_EDITOR_SLASH_ITEMS: MessageEditorSlashMenuItem[] = [
  { kind: "paragraph", keyword: "text", label: "正文", description: "普通文本段落" },
  { kind: "heading1", keyword: "h1", label: "大标题", description: "插入 # 标题" },
  { kind: "heading2", keyword: "h2", label: "中标题", description: "插入 ## 标题" },
  { kind: "heading3", keyword: "h3", label: "小标题", description: "插入 ### 标题" },
  { kind: "bulletedList", keyword: "list", label: "列表", description: "插入 - 列表项" },
  { kind: "numberedList", keyword: "ol", label: "编号", description: "插入 1. 列表项" },
  { kind: "quote", keyword: "quote", label: "引用", description: "插入 > 引用" },
  { kind: "intro", keyword: "intro", label: "黑幕", description: "黑底文字块" },
  { kind: "image", keyword: "image", label: "图片", description: "插入图片消息块" },
  { kind: "file", keyword: "file", label: "文件", description: "插入文件消息块" },
  { kind: "audio", keyword: "audio", label: "音频", description: "插入音频消息块" },
  { kind: "video", keyword: "video", label: "视频", description: "插入视频消息块" },
  { kind: "dice", keyword: "dice", label: "骰子", description: "插入骰子结果块" },
  { kind: "choose", keyword: "choose", label: "选择", description: "插入 WebGAL 选项块" },
];

/**
 * 从文本块任意一行解析 slash 查询。
 */
export function extractMessageEditorSlashQuery(value: string): string | null {
  const normalized = value.replace(/\r\n?/g, "\n");
  let lineStart = 0;

  while (lineStart <= normalized.length) {
    const lineEnd = normalized.indexOf("\n", lineStart);
    const rawLine = lineEnd >= 0 ? normalized.slice(lineStart, lineEnd) : normalized.slice(lineStart);
    const match = rawLine.trimStart().match(/^\/\s*(\S*)$/);
    if (match) {
      return match[1].toLowerCase();
    }

    if (lineEnd < 0) {
      break;
    }
    lineStart = lineEnd + 1;
  }

  return null;
}

/**
 * 按 slash 查询过滤块命令候选项。
 */
export function filterMessageEditorSlashMenuItems(query: string): MessageEditorSlashMenuItem[] {
  if (!query) {
    return [...MESSAGE_EDITOR_SLASH_ITEMS];
  }

  return MESSAGE_EDITOR_SLASH_ITEMS.filter(item => item.keyword.includes(query)
    || item.label.toLowerCase().includes(query)
    || item.description.toLowerCase().includes(query));
}

/**
 * 解析 slash 菜单的可见状态和候选项。
 */
export function resolveMessageEditorSlashMenuState(params: {
  activeBlockId?: string | null;
  content: unknown;
  dismissedSlashKey?: string | null;
  readOnly: boolean;
}): MessageEditorSlashMenuState | null {
  if (params.readOnly || !params.activeBlockId) {
    return null;
  }

  const content = normalizeMessageEditorContent(params.content);
  if (extractMessageEditorSpeakerCommandMatch(content)) {
    return null;
  }

  const query = extractMessageEditorSlashQuery(content);
  if (query == null) {
    return null;
  }

  const slashKey = `${params.activeBlockId}:${query}`;
  if (params.dismissedSlashKey === slashKey) {
    return null;
  }

  const items = filterMessageEditorSlashMenuItems(query);
  if (items.length === 0) {
    return null;
  }

  return {
    blockId: params.activeBlockId,
    items,
    slashKey,
  };
}
