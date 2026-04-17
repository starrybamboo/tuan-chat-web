import type { SlashMenuItem, SlashMenuTooltip } from "@blocksuite/affine/widgets/slash-menu";

export type BlocksuiteFilterableListItem = {
  name: string;
  label?: string;
  aliases?: string[];
};

export type BlocksuiteFilterableListOptions<TItem extends BlocksuiteFilterableListItem = BlocksuiteFilterableListItem> = {
  items?: TItem[];
  placeholder?: string;
};

type LocalizedBlocksuiteFilterableListItem<TItem extends BlocksuiteFilterableListItem> = TItem & {
  name: string;
  label?: string;
  aliases: string[];
};

export type LocalizedBlocksuiteFilterableListOptions<T extends BlocksuiteFilterableListOptions> = Omit<T, "items" | "placeholder"> & {
  items?: Array<LocalizedBlocksuiteFilterableListItem<NonNullable<T["items"]>[number]>>;
  placeholder: string;
};

const BLOCKSUITE_UI_TEXT_MAP: Record<string, string> = {
  "(Coming soon)": "（即将支持）",
  "Actions": "操作",
  "Attachment": "附件",
  "Attach a file to document.": "向文档附加一个文件。",
  "Basic": "基础",
  "Bold": "加粗",
  "Bold Text": "加粗文本",
  "Bulleted List": "无序列表",
  "Code Block": "代码块",
  "Code snippet with formatting.": "插入带格式的代码片段。",
  "Content & Media": "内容与媒体",
  "Copied to clipboard": "已复制到剪贴板",
  "Copy": "复制",
  "Copy this line to clipboard.": "复制这一行到剪贴板。",
  "Create a duplicate of this line.": "创建这一行的副本。",
  "Create a equation block.": "创建一个公式块。",
  "Create a inline equation.": "创建一个行内公式。",
  "Create a numbered list.": "创建一个有序列表。",
  "Create a simple table.": "创建一个简单表格。",
  "Date": "日期",
  "Delete": "删除",
  "Deleted doc": "已删除文档",
  "Delete Database": "删除数据库",
  "Display items in a table format.": "以表格形式展示条目。",
  "Divider": "分割线",
  "Duplicate": "复制副本",
  "Edgeless": "画布",
  "Edgeless Element": "画布元素",
  "Embed": "嵌入",
  "Equation": "公式",
  "Fit to screen": "适应屏幕",
  "For Google Drive, and more.": "用于嵌入 Google Drive 等内容。",
  "Frame": "框架",
  "Group": "分组",
  "Heading 1": "标题 1",
  "Heading 2": "标题 2",
  "Heading 3": "标题 3",
  "Heading 4": "标题 4",
  "Heading 5": "标题 5",
  "Heading 6": "标题 6",
  "Heading #1": "标题 1",
  "Heading #2": "标题 2",
  "Heading #3": "标题 3",
  "Heading #4": "标题 4",
  "Heading #5": "标题 5",
  "Heading #6": "标题 6",
  "Headings in the 2nd font size.": "使用第 2 级标题字号。",
  "Headings in the 3rd font size.": "使用第 3 级标题字号。",
  "Headings in the 4th font size.": "使用第 4 级标题字号。",
  "Headings in the 5th font size.": "使用第 5 级标题字号。",
  "Headings in the 6th font size.": "使用第 6 级标题字号。",
  "Headings in the largest font.": "使用最大的标题字号。",
  "Image": "图片",
  "Inline equation": "行内公式",
  "Italic": "斜体",
  "Kanban View": "看板视图",
  "Link": "链接",
  "Link Doc": "链接文档",
  "Link to another document.": "链接到另一份文档。",
  "Loading": "加载中",
  "Mention Profile": "提及用户",
  "Mention Role": "提及角色",
  "Mind Map": "思维导图",
  "More": "更多",
  "More menu": "更多菜单",
  "Move Down": "下移",
  "Move Up": "上移",
  "New Doc": "新建文档",
  "Now": "现在",
  "Numbered List": "有序列表",
  "Other Headings": "其他标题",
  "Page": "页面",
  "PDF": "PDF",
  "Photo": "图片",
  "Quote": "引用",
  "Remove this line permanently.": "永久删除这一行。",
  "Search": "搜索",
  "Shift this line down.": "将这一行下移。",
  "Shift this line up.": "将这一行上移。",
  "Start a new document.": "开始一份新文档。",
  "Start typing with plain text.": "以普通文本开始输入。",
  "Strikethrough": "删除线",
  "Style": "样式",
  "Table": "表格",
  "Table View": "表格视图",
  "Text": "文本",
  "To-do List": "待办列表",
  "Type '/' for commands": "输入“/”查看命令",
  "Toggle Zoom Tool Bar": "切换缩放工具栏",
  "Tomorrow": "明天",
  "Underline": "下划线",
  "Untitled": "未命名文档",
  "Upload a PDF to document.": "向文档上传一个 PDF。",
  "Visualize data in a dashboard.": "以看板形式可视化数据。",
  "Yesterday": "昨天",
  "Zoom in": "放大",
  "Zoom out": "缩小",
};

type TranslationRule = {
  pattern: RegExp;
  replace: (...matches: string[]) => string;
};

const BLOCKSUITE_UI_TEXT_RULES: TranslationRule[] = [
  {
    pattern: /^Downloading (.+)$/,
    replace: (_full, name) => `正在下载 ${name}`,
  },
  {
    pattern: /^Failed to download (.+)!$/,
    replace: (_full, name) => `下载 ${name} 失败！`,
  },
  {
    pattern: /^Frame: (.+)$/,
    replace: (_full, title) => `框架：${title}`,
  },
  {
    pattern: /^Group: (.+)$/,
    replace: (_full, title) => `分组：${title}`,
  },
  {
    pattern: /^You can only upload files less than (.+)$/,
    replace: (_full, size) => `只能上传小于 ${size} 的文件`,
  },
];

function translateWrappedText(value: string): string {
  const direct = translateBlocksuiteUiText(value);
  if (direct !== value) {
    return direct;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === value) {
    return value;
  }

  const translatedTrimmed = translateBlocksuiteUiText(trimmed);
  if (translatedTrimmed === trimmed) {
    return value;
  }

  const start = value.indexOf(trimmed);
  const end = start + trimmed.length;
  return `${value.slice(0, start)}${translatedTrimmed}${value.slice(end)}`;
}

function translateBlocksuiteSlashTooltip(tooltip: SlashMenuTooltip | undefined): SlashMenuTooltip | undefined {
  if (!tooltip) {
    return tooltip;
  }

  return {
    ...tooltip,
    caption: translateBlocksuiteUiText(tooltip.caption),
  };
}

function translateBlocksuiteSearchAliases(searchAlias: string[] | undefined): string[] | undefined {
  if (!searchAlias?.length) {
    return searchAlias;
  }

  const deduped = new Set<string>();
  for (const alias of searchAlias) {
    deduped.add(alias);
    const translated = translateBlocksuiteUiText(alias);
    if (translated !== alias) {
      deduped.add(translated);
    }
  }

  return [...deduped];
}

export function translateBlocksuiteUiText(value: string): string {
  const exact = BLOCKSUITE_UI_TEXT_MAP[value];
  if (exact) {
    return exact;
  }

  for (const rule of BLOCKSUITE_UI_TEXT_RULES) {
    const matched = value.match(rule.pattern);
    if (matched) {
      return rule.replace(...matched);
    }
  }

  return value;
}

export function translateBlocksuiteSlashGroup(group: string | undefined): string | undefined {
  if (!group) {
    return group;
  }

  const matched = group.match(/^(\d+)_([^@]+)@(\d+)$/);
  if (!matched) {
    return translateBlocksuiteUiText(group);
  }

  const [, groupIndex, groupName, itemIndex] = matched;
  const translatedName = translateBlocksuiteUiText(groupName);
  if (translatedName === groupName) {
    return group;
  }

  return `${groupIndex}_${translatedName}@${itemIndex}`;
}

export function translateBlocksuiteSlashItem<T extends SlashMenuItem>(item: T): T {
  const localized = {
    ...item,
    name: translateBlocksuiteUiText(item.name),
    description: item.description ? translateBlocksuiteUiText(item.description) : item.description,
    group: translateBlocksuiteSlashGroup(item.group),
    searchAlias: translateBlocksuiteSearchAliases(item.searchAlias),
  } as T & {
    tooltip?: SlashMenuTooltip;
    subMenu?: SlashMenuItem[];
  };

  if ("tooltip" in item) {
    localized.tooltip = translateBlocksuiteSlashTooltip(item.tooltip);
  }

  if ("subMenu" in item && Array.isArray(item.subMenu)) {
    localized.subMenu = item.subMenu.map(child => translateBlocksuiteSlashItem(child));
  }

  return localized;
}

export function localizeBlocksuiteFilterableListOptions<T extends BlocksuiteFilterableListOptions>(
  options: T,
): LocalizedBlocksuiteFilterableListOptions<T> {
  return {
    ...options,
    placeholder: translateBlocksuiteUiText(options.placeholder ?? "Search"),
    items: options.items?.map((item) => {
      const translatedName = translateBlocksuiteUiText(item.name);
      const translatedLabel = item.label ? translateBlocksuiteUiText(item.label) : item.label;
      const aliases = new Set(item.aliases ?? []);

      aliases.add(item.name.toLowerCase());
      if (translatedName !== item.name) {
        aliases.add(translatedName.toLowerCase());
      }
      if (translatedLabel && translatedLabel !== item.label) {
        aliases.add(translatedLabel.toLowerCase());
      }

      return {
        ...item,
        name: translatedName,
        label: translatedLabel,
        aliases: [...aliases],
      };
    }),
  } as LocalizedBlocksuiteFilterableListOptions<T>;
}

export function translateBlocksuiteElementText(node: ParentNode): void {
  const ownerDocument = node instanceof Document ? node : node.ownerDocument;
  if (!ownerDocument) {
    return;
  }

  const walker = ownerDocument.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    const original = textNode.textContent ?? "";
    const translated = translateWrappedText(original);
    if (translated !== original) {
      textNode.textContent = translated;
    }
    current = walker.nextNode();
  }
}

export function translateBlocksuiteElementAttributes(element: Element): void {
  for (const attributeName of ["aria-label", "title", "placeholder"]) {
    const value = element.getAttribute(attributeName);
    if (!value) {
      continue;
    }

    const translated = translateBlocksuiteUiText(value);
    if (translated !== value) {
      element.setAttribute(attributeName, translated);
    }
  }
}
