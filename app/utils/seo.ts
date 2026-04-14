const SITE_NAME = "团剧共创";
const DEFAULT_SITE_URL = "https://tuan.chat";
const DEFAULT_DESCRIPTION = "团剧共创是面向团剧、模组与设定创作的协作平台，可用于发现公开模组、浏览素材库、管理角色和作品。";
const INDEX_ROBOTS = "index, follow";
const NOINDEX_ROBOTS = "noindex, nofollow";

type SeoMetaDescriptor
  = | { title: string }
    | { name: string; content: string }
    | { property: string; content: string };

type SeoOptions = {
  title: string;
  description?: string;
  path?: string;
  index?: boolean;
  type?: "website" | "article" | "profile";
  image?: string;
};

function getSiteUrl() {
  const envSiteUrl = String(import.meta.env.VITE_PUBLIC_SITE_URL || "").trim();
  const siteUrl = envSiteUrl || DEFAULT_SITE_URL;
  return siteUrl.replace(/\/+$/, "");
}

function normalizePath(path = "/") {
  if (!path) {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function toAbsoluteUrl(path?: string) {
  if (!path) {
    return `${getSiteUrl()}/`;
  }
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return `${getSiteUrl()}${normalizePath(path)}`;
}

function normalizeDescription(description?: string) {
  const trimmed = description?.trim();
  if (!trimmed) {
    return DEFAULT_DESCRIPTION;
  }
  if (trimmed.length <= 160) {
    return trimmed;
  }
  return `${trimmed.slice(0, 157)}...`;
}

function buildTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    return SITE_NAME;
  }
  return trimmed.includes(SITE_NAME) ? trimmed : `${trimmed} - ${SITE_NAME}`;
}

function buildRobots(index: boolean) {
  if (import.meta.env.MODE === "test") {
    return NOINDEX_ROBOTS;
  }
  return index ? INDEX_ROBOTS : NOINDEX_ROBOTS;
}

export function getCanonicalHref(path?: string) {
  return toAbsoluteUrl(path);
}

export function createSeoMeta({
  title,
  description,
  path,
  index = false,
  type = "website",
  image,
}: SeoOptions): SeoMetaDescriptor[] {
  const fullTitle = buildTitle(title);
  const normalizedDescription = normalizeDescription(description);
  const canonicalUrl = toAbsoluteUrl(path);
  const normalizedImage = image ? toAbsoluteUrl(image) : "";

  const meta: SeoMetaDescriptor[] = [
    { title: fullTitle },
    { name: "description", content: normalizedDescription },
    { name: "robots", content: buildRobots(index) },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: normalizedDescription },
    { property: "og:type", content: type },
    { property: "og:url", content: canonicalUrl },
    { name: "twitter:card", content: normalizedImage ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: normalizedDescription },
  ];

  if (normalizedImage) {
    meta.push(
      { property: "og:image", content: normalizedImage },
      { name: "twitter:image", content: normalizedImage },
    );
  }

  return meta;
}
