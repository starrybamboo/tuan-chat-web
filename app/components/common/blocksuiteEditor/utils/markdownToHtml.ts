export type MarkdownHtmlConvertOptions = {
  /** 是否启用 GFM（表格/任务列表/删除线等）。默认 true。 */
  gfm?: boolean;
  /** 是否允许 Markdown 内嵌 HTML。默认 true（会配合 sanitize 过滤）。 */
  allowInlineHtml?: boolean;
};

const defaultOptions: Required<MarkdownHtmlConvertOptions> = {
  gfm: true,
  allowInlineHtml: true,
};

/**
 * Markdown -> HTML（纯前端）。
 *
 * - 支持 GFM（表格/任务列表/删除线等）
 * - 允许 Markdown 内嵌 HTML，但会经过 sanitize 过滤
 */
export async function markdownToHtml(markdown: string, options: MarkdownHtmlConvertOptions = {}): Promise<string> {
  const { gfm, allowInlineHtml } = { ...defaultOptions, ...options };

  if (!markdown || markdown.trim().length === 0)
    return "";

  const { unified } = await import("unified");
  const { default: remarkParse } = await import("remark-parse");
  const { default: remarkRehype } = await import("remark-rehype");
  const { default: rehypeStringify } = await import("rehype-stringify");
  const { default: rehypeRaw } = await import("rehype-raw");
  const { default: rehypeSanitize } = await import("rehype-sanitize");

  const processor = unified().use(remarkParse);

  if (gfm) {
    const { default: remarkGfm } = await import("remark-gfm");
    processor.use(remarkGfm);
  }

  processor
    .use(remarkRehype, {
      // 需要 allowDangerousHtml + rehype-raw 才能解析 Markdown 中的内嵌 HTML
      allowDangerousHtml: allowInlineHtml,
    });

  if (allowInlineHtml) {
    processor.use(rehypeRaw);
  }

  processor
    // 默认 schema 会过滤掉 script/on* 事件等危险内容
    .use(rehypeSanitize)
    .use(rehypeStringify);

  const result = await processor.process(markdown);
  return String(result);
}

/**
 * HTML -> Markdown（纯前端）。
 *
 * - 会先 sanitize 再转 Markdown，避免把危险标签/属性带回去
 * - 输出尽量贴近常见 Markdown/GFM 习惯
 */
export async function htmlToMarkdown(html: string, options: MarkdownHtmlConvertOptions = {}): Promise<string> {
  const { gfm } = { ...defaultOptions, ...options };

  if (!html || html.trim().length === 0)
    return "";

  const { unified } = await import("unified");
  const { default: rehypeParse } = await import("rehype-parse");
  const rehypeRemarkModuleName: string = "rehype-remark";
  const { default: rehypeRemark } = await import(rehypeRemarkModuleName);
  const { default: remarkStringify } = await import("remark-stringify");
  const { default: rehypeSanitize } = await import("rehype-sanitize");

  const processor = unified()
    // fragment: true 允许处理非完整 HTML 文档
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize)
    .use(rehypeRemark);

  if (gfm) {
    const { default: remarkGfm } = await import("remark-gfm");
    processor.use(remarkGfm);
  }

  processor.use(remarkStringify, {
    bullet: "-",
    fences: true,
    fence: "`",
    listItemIndent: "one",
  });

  const result = await processor.process(html);
  return String(result).trimEnd();
}
