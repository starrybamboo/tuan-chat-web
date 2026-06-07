import { externalMessageMediaSource } from "@/components/chat/message/messageMediaSource";

import { MessageType } from "../../../../api/wsModels";

type CqMediaToken = {
  raw: string;
  type: "image" | "record" | "video";
  url: string;
  fileName: string;
};

type ImportedCqMediaMessageFields = {
  content: string;
  messageType: MessageType;
  extra: Record<string, unknown>;
};

const CQ_MEDIA_REGEX = /\[CQ:(image|record|video),([^\]]+)\]/i;
const MIRAI_IMAGE_REGEX = /\[mirai:image:([^\]]+)\]/i;
const MARKDOWN_IMAGE_REGEX = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i;
const HTML_IMAGE_TAG_REGEX = /<img\b[^>]*>/i;
const HTML_IMAGE_SRC_REGEX = /\ssrc=["'](https?:\/\/[^"']+)["']/i;

function parseCqAttributes(rawAttributes: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const urlMarker = ",url=";
  const urlMarkerIndex = rawAttributes.indexOf(urlMarker);
  const prefix = urlMarkerIndex >= 0 ? rawAttributes.slice(0, urlMarkerIndex) : rawAttributes;
  if (urlMarkerIndex >= 0) {
    attributes.url = rawAttributes.slice(urlMarkerIndex + urlMarker.length);
  }
  prefix.split(",").forEach((segment) => {
    const separatorIndex = segment.indexOf("=");
    if (separatorIndex <= 0) {
      return;
    }
    const key = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();
    if (key) {
      attributes[key] = value;
    }
  });
  return attributes;
}

function fallbackFileNameFromUrl(url: string, type: CqMediaToken["type"]) {
  const fallback = type === "image" ? "image" : type === "record" ? "audio" : "video";
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop();
    return lastSegment || fallback;
  }
  catch {
    return fallback;
  }
}

function extractFirstHtmlImage(content: string): Pick<CqMediaToken, "raw" | "url"> | null {
  const matched = content.match(HTML_IMAGE_TAG_REGEX);
  const url = matched?.[0].match(HTML_IMAGE_SRC_REGEX)?.[1]?.trim();
  if (!matched || !url) {
    return null;
  }
  return {
    raw: matched[0],
    url,
  };
}

function extractFirstCqMediaToken(content: string): CqMediaToken | null {
  const matched = content.match(CQ_MEDIA_REGEX);
  if (!matched) {
    return null;
  }
  const type = matched[1]?.toLowerCase() as CqMediaToken["type"] | undefined;
  const rawAttributes = matched[2] ?? "";
  if (!type) {
    return null;
  }
  const attributes = parseCqAttributes(rawAttributes);
  const url = attributes.url?.trim();
  if (!url) {
    return null;
  }
  return {
    raw: matched[0],
    type,
    url,
    fileName: attributes.file?.trim() || fallbackFileNameFromUrl(url, type),
  };
}

function extractFirstMiraiImageToken(content: string): CqMediaToken | null {
  const matched = content.match(MIRAI_IMAGE_REGEX);
  if (!matched) {
    return null;
  }
  const raw = matched[0];
  const fileName = matched[1]?.trim() || "image";
  const markdownMatched = content.match(MARKDOWN_IMAGE_REGEX);
  const htmlMatched = markdownMatched ? null : extractFirstHtmlImage(content);
  const url = markdownMatched?.[1]?.trim() ?? htmlMatched?.url;
  if (!url) {
    return null;
  }
  return {
    raw,
    type: "image",
    url,
    fileName,
  };
}

function extractFirstMarkdownOrHtmlImageToken(content: string): CqMediaToken | null {
  const markdownMatched = content.match(MARKDOWN_IMAGE_REGEX);
  const htmlMatched = markdownMatched ? null : extractFirstHtmlImage(content);
  const raw = markdownMatched?.[0] ?? htmlMatched?.raw;
  const url = markdownMatched?.[1]?.trim() ?? htmlMatched?.url;
  if (!raw || !url) {
    return null;
  }
  return {
    raw,
    type: "image",
    url,
    fileName: fallbackFileNameFromUrl(url, "image"),
  };
}

function removeCqToken(content: string, token: CqMediaToken) {
  const withoutTextTokens = content
    .replace(token.raw, "")
    .replace(MIRAI_IMAGE_REGEX, "")
    .replace(MARKDOWN_IMAGE_REGEX, "");
  const htmlMatched = extractFirstHtmlImage(withoutTextTokens);
  return (htmlMatched ? withoutTextTokens.replace(htmlMatched.raw, "") : withoutTextTokens)
    .replace(/\s+/g, " ")
    .trim();
}

export function stripUnsupportedImportedMediaPlaceholders(content: string) {
  const normalizedContent = String(content ?? "");
  if (
    extractFirstCqMediaToken(normalizedContent)
    || extractFirstMiraiImageToken(normalizedContent)
    || extractFirstMarkdownOrHtmlImageToken(normalizedContent)
  ) {
    return normalizedContent.trim();
  }
  return normalizedContent
    .replace(MIRAI_IMAGE_REGEX, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildImportedCqMediaMessageFields(content: string): ImportedCqMediaMessageFields | null {
  const cqMediaToken = extractFirstCqMediaToken(content)
    ?? extractFirstMiraiImageToken(content)
    ?? extractFirstMarkdownOrHtmlImageToken(content);
  if (!cqMediaToken) {
    return null;
  }

  const nextContent = removeCqToken(content, cqMediaToken);
  if (cqMediaToken.type === "image") {
    return {
      content: nextContent,
      messageType: MessageType.IMG,
      extra: {
        imageMessage: {
          source: externalMessageMediaSource(cqMediaToken.url, "cq"),
          fileName: cqMediaToken.fileName,
          width: 1,
          height: 1,
          background: false,
        },
      },
    };
  }

  if (cqMediaToken.type === "record") {
    return {
      content: nextContent,
      messageType: MessageType.SOUND,
      extra: {
        soundMessage: {
          source: externalMessageMediaSource(cqMediaToken.url, "cq"),
          fileName: cqMediaToken.fileName,
          second: 1,
        },
      },
    };
  }

  return {
    content: nextContent,
    messageType: MessageType.VIDEO,
    extra: {
      videoMessage: {
        source: externalMessageMediaSource(cqMediaToken.url, "cq"),
        fileName: cqMediaToken.fileName,
      },
    },
  };
}
