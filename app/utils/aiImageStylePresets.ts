export type AiImageStylePreset = {
  id: string;
  title: string;
  imageUrl?: string;
  tags: string[];
  negativeTags: string[];
};

type AiImageStyleTagConfig = {
  tags?: string[];
  negativeTags?: string[];
};

const STYLE_TAGS_BY_ID: Record<string, AiImageStyleTagConfig> = {
  // 你可以在这里按需新增/修改：
  // 1) 在 `app/assets/ai-image/styles/` 放一张图片（文件名即 id，例如 `oil-painting.webp`）
  // 2) 在这里添加同名 key（例如 `oil-painting`），写入对应 tags/negativeTags
  //
  // 例子（可删）：
  // "anime-clean": { tags: ["anime", "clean lineart", "vibrant colors"] },
  // "cinematic": { tags: ["cinematic lighting", "film grain"], negativeTags: ["lowres"] },
};

function toStyleTitleFromId(id: string) {
  return id.replace(/[_-]+/g, " ").trim() || id;
}

function basenameNoExt(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const file = normalized.split("/").pop() || "";
  return file.replace(/\.[^.]+$/, "");
}

function uniqStrings(values: string[]) {
  const set = new Set<string>();
  for (const v of values) {
    const s = String(v || "").trim();
    if (!s)
      continue;
    set.add(s);
  }
  return Array.from(set);
}

function normalizeTagList(values?: string[]) {
  if (!Array.isArray(values))
    return [];
  return uniqStrings(values);
}

function normalizeId(value: string) {
  return String(value || "").trim();
}

export function getAiImageStylePresets(): AiImageStylePreset[] {
  const images = import.meta.glob("../assets/ai-image/styles/*.{png,webp,jpg,jpeg}", {
    eager: true,
    import: "default",
  }) as Record<string, string>;

  const imageIds = Object.keys(images)
    .map(path => basenameNoExt(path))
    .map(normalizeId)
    .filter(Boolean);

  const allIds = uniqStrings([...imageIds, ...Object.keys(STYLE_TAGS_BY_ID)]);

  return allIds
    .map((id) => {
      const imagePath = Object.keys(images).find(path => basenameNoExt(path) === id);
      const imageUrl = imagePath ? images[imagePath] : undefined;
      const config = STYLE_TAGS_BY_ID[id] || {};
      return {
        id,
        title: toStyleTitleFromId(id),
        imageUrl,
        tags: normalizeTagList(config.tags),
        negativeTags: normalizeTagList(config.negativeTags),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
