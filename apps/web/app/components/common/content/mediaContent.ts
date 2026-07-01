import type { MediaQuality, MediaType } from "@/utils/media/imgCompressUtils";

import { mediaFileUrl } from "@/utils/media/mediaUrl";

const IMAGE_MARKDOWN_RE = /!\[[^\]]*\]\(([^)]+)\)/g;
const VIDEO_TOKEN_RE = /\{\{\s*video\s*:\s*([^\s}]+)\s*\}\}/gi;
const FILE_TOKEN_RE = /\{\{\s*file\s*:\s*([^|}\s]+)(?:\|([^}]*?))?\s*\}\}/gi;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const TC_MEDIA_TOKEN_RE = /^tc-media:\/\/(?:(image|audio|video|document|other)\/)?(\d+)$/i;

const MEDIA_IMAGE_PREVIEW_TEXT = "含图片";
const MEDIA_VIDEO_PREVIEW_TEXT = "含视频";
const MEDIA_FILE_PREVIEW_TEXT = "含附件";
const MEDIA_IMAGE_VIDEO_PREVIEW_TEXT = "含图片与视频";
const MEDIA_IMAGE_FILE_PREVIEW_TEXT = "含图片与附件";
const MEDIA_VIDEO_FILE_PREVIEW_TEXT = "含视频与附件";
const MEDIA_IMAGE_VIDEO_FILE_PREVIEW_TEXT = "含图片、视频与附件";

type MediaContentParts = {
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

function normalizeFileTokenName(fileName: string | null | undefined) {
  return String(fileName ?? "")
    .replace(/[{}\r\n|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildFileToken(fileId: number | string, mediaType: MediaType, fileName?: string | null) {
  const source = buildMediaReferenceToken(fileId, mediaType);
  const normalizedFileName = normalizeFileTokenName(fileName);
  return normalizedFileName ? `{{file:${source}|${normalizedFileName}}}` : `{{file:${source}}}`;
}

export function buildMediaReferenceToken(fileId: number | string, mediaType: MediaType) {
  return `tc-media://${mediaType}/${String(fileId).trim()}`;
}

export function resolveMediaContentSource(
  source: string | null | undefined,
  fallbackMediaType: MediaType,
  quality: MediaQuality = "medium",
) {
  const value = String(source ?? "").trim();
  if (!value) {
    return "";
  }
  const match = value.match(TC_MEDIA_TOKEN_RE);
  if (!match) {
    return value;
  }
  const mediaType = (match[1] || fallbackMediaType) as MediaType;
  return mediaFileUrl(match[2], mediaType, quality);
}

export function composeMediaContent(parts?: MediaContentParts) {
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
  const fileMatches = source.matchAll(clonePattern(FILE_TOKEN_RE));
  let imageCount = 0;
  let videoCount = 0;
  let fileCount = 0;

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

  for (const match of fileMatches) {
    if (String(match[1] ?? "").trim()) {
      fileCount += 1;
    }
  }

  return { fileCount, imageCount, videoCount };
}

function extractMediaText(content?: string | null) {
  const source = normalizeMultiline(content);
  return source
    .replace(clonePattern(IMAGE_MARKDOWN_RE), " ")
    .replace(clonePattern(VIDEO_TOKEN_RE), " ")
    .replace(clonePattern(FILE_TOKEN_RE), " ")
    .replace(clonePattern(MARKDOWN_LINK_RE), "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasMeaningfulMediaContent(content?: string | null) {
  const { fileCount, imageCount, videoCount } = countMediaInContent(content);
  return imageCount > 0 || videoCount > 0 || fileCount > 0 || extractMediaText(content).length > 0;
}

export function buildMediaContentPreview(content?: string | null, limit = 80, emptyFallback = "") {
  const text = extractMediaText(content);
  if (text) {
    return text.length <= limit ? text : `${text.slice(0, limit).trim()}...`;
  }

  const { fileCount, imageCount, videoCount } = countMediaInContent(content);
  if (imageCount > 0 && videoCount > 0 && fileCount > 0) {
    return MEDIA_IMAGE_VIDEO_FILE_PREVIEW_TEXT;
  }
  if (imageCount > 0 && videoCount > 0) {
    return MEDIA_IMAGE_VIDEO_PREVIEW_TEXT;
  }
  if (imageCount > 0 && fileCount > 0) {
    return MEDIA_IMAGE_FILE_PREVIEW_TEXT;
  }
  if (videoCount > 0 && fileCount > 0) {
    return MEDIA_VIDEO_FILE_PREVIEW_TEXT;
  }
  if (imageCount > 0) {
    return MEDIA_IMAGE_PREVIEW_TEXT;
  }
  if (videoCount > 0) {
    return MEDIA_VIDEO_PREVIEW_TEXT;
  }
  if (fileCount > 0) {
    return MEDIA_FILE_PREVIEW_TEXT;
  }
  return emptyFallback;
}

export function formatMediaContentSummary(content?: string | null, emptyLabel = "未附带媒体") {
  const { fileCount, imageCount, videoCount } = countMediaInContent(content);
  const parts: string[] = [];

  if (imageCount > 0) {
    parts.push(`${imageCount} 张图片`);
  }
  if (videoCount > 0) {
    parts.push(`${videoCount} 个视频`);
  }
  if (fileCount > 0) {
    parts.push(`${fileCount} 个附件`);
  }

  return parts.length > 0 ? `共 ${parts.join(" · ")}` : emptyLabel;
}

export function measureMediaContentLength(content?: string | null) {
  return normalizeMultiline(content)
    .replace(clonePattern(IMAGE_MARKDOWN_RE), "[图片]")
    .replace(clonePattern(VIDEO_TOKEN_RE), "[视频]")
    .replace(clonePattern(FILE_TOKEN_RE), "[附件]")
    .replace(clonePattern(MARKDOWN_LINK_RE), "$1")
    .trim()
    .length;
}
