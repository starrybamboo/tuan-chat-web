const IMAGE_MARKDOWN_RE = /!\[[^\]]*\]\(([^)]+)\)/g;
const VIDEO_TOKEN_RE = /\{\{\s*video\s*:\s*([^\s}]+)\s*\}\}/gi;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

const MEDIA_IMAGE_PREVIEW_TEXT = "含图片";
const MEDIA_VIDEO_PREVIEW_TEXT = "含视频";
const MEDIA_IMAGE_VIDEO_PREVIEW_TEXT = "含图片与视频";

type LegacyMediaContentParts = {
  text?: string | null;
  images?: string[] | null;
  videos?: string[] | null;
};

function clonePattern(pattern: RegExp) {
  return new RegExp(pattern.source, pattern.flags);
}

function normalizeMultiline(value?: string | null) {
  return String(value ?? "").replace(/\r\n?/g, "\n");
}

function normalizeUrlList(values?: string[] | null) {
  return (values ?? [])
    .map(value => String(value ?? "").trim())
    .filter(Boolean);
}

export function normalizeMediaContent(content?: string | null) {
  return normalizeMultiline(content).trim();
}

export function buildImageMarkdown(url: string, altText = "image") {
  const normalizedUrl = String(url ?? "").trim();
  const normalizedAltText = String(altText ?? "image")
    .replace(/[[\]\r\n]/g, " ")
    .trim() || "image";
  return `![${normalizedAltText}](${normalizedUrl})`;
}

export function buildVideoToken(url: string) {
  return `{{video:${String(url ?? "").trim()}}}`;
}

export function composeMediaContent(parts?: LegacyMediaContentParts) {
  const blocks: string[] = [];
  const text = normalizeMediaContent(parts?.text);
  if (text) {
    blocks.push(text);
  }
  normalizeUrlList(parts?.images).forEach((url, index) => {
    blocks.push(buildImageMarkdown(url, `反馈图片 ${index + 1}`));
  });
  normalizeUrlList(parts?.videos).forEach((url) => {
    blocks.push(buildVideoToken(url));
  });
  return blocks.join("\n\n");
}

function countMediaInContent(content?: string | null) {
  const source = normalizeMultiline(content);
  const imageMatches = source.matchAll(clonePattern(IMAGE_MARKDOWN_RE));
  const videoMatches = source.matchAll(clonePattern(VIDEO_TOKEN_RE));
  let imageCount = 0;
  let videoCount = 0;

  for (const match of imageMatches) {
    if (String(match[1] ?? "").trim()) {
      imageCount += 1;
    }
  }

  for (const match of videoMatches) {
    if (String(match[1] ?? "").trim()) {
      videoCount += 1;
    }
  }

  return { imageCount, videoCount };
}

function extractMediaText(content?: string | null) {
  const source = normalizeMultiline(content);
  return source
    .replace(clonePattern(IMAGE_MARKDOWN_RE), " ")
    .replace(clonePattern(VIDEO_TOKEN_RE), " ")
    .replace(clonePattern(MARKDOWN_LINK_RE), "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasMeaningfulMediaContent(content?: string | null) {
  const { imageCount, videoCount } = countMediaInContent(content);
  return imageCount > 0 || videoCount > 0 || extractMediaText(content).length > 0;
}

export function buildMediaContentPreview(content?: string | null, limit = 80, emptyFallback = "") {
  const text = extractMediaText(content);
  if (text) {
    return text.length <= limit ? text : `${text.slice(0, limit).trim()}...`;
  }

  const { imageCount, videoCount } = countMediaInContent(content);
  if (imageCount > 0 && videoCount > 0) {
    return MEDIA_IMAGE_VIDEO_PREVIEW_TEXT;
  }
  if (imageCount > 0) {
    return MEDIA_IMAGE_PREVIEW_TEXT;
  }
  if (videoCount > 0) {
    return MEDIA_VIDEO_PREVIEW_TEXT;
  }
  return emptyFallback;
}

export function formatMediaContentSummary(content?: string | null, emptyLabel = "未附带媒体") {
  const { imageCount, videoCount } = countMediaInContent(content);
  const parts: string[] = [];

  if (imageCount > 0) {
    parts.push(`${imageCount} 张图片`);
  }
  if (videoCount > 0) {
    parts.push(`${videoCount} 个视频`);
  }

  return parts.length > 0 ? `共 ${parts.join(" · ")}` : emptyLabel;
}

export function measureMediaContentLength(content?: string | null) {
  return normalizeMultiline(content)
    .replace(clonePattern(IMAGE_MARKDOWN_RE), "[图片]")
    .replace(clonePattern(VIDEO_TOKEN_RE), "[视频]")
    .replace(clonePattern(MARKDOWN_LINK_RE), "$1")
    .trim()
    .length;
}
