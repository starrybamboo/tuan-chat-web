export type AiImageStylePreset = {
  id: string;
  title: string;
  imageUrl?: string;
  tags: string[];
  negativeTags: string[];
};

export type AiImageStylePresetSource = "select" | "compare";

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
  akizero1510: { tags: ["akizero1510"] },
  rurudo: { tags: ["rurudo"] },
  umemaro: { tags: ["umemaro(siona0908)"] },
};

const COMPARE_STYLE_TAGS_BY_ID: Record<string, AiImageStyleTagConfig> = {
  akizero1510: { tags: ["akizero1510"] },
  rurudo: { tags: ["rurudo"] },
  umemaro: { tags: ["umemaro(siona0908)"] },
  写实: {
    tags: [
      "1.3:: ningen mame ::",
      "1.2:: fuzichoco ::",
      "1.1:: sy4 ::",
      "0.85:: konya_karasue ::",
      "0.8:: morikura_en ::",
      "0.7:: laserflip ::",
      "0.65:: sasaame ::",
      "0.6:: ogipote ::",
      "0.55:: mauve ::",
      "0.5:: ask_(askzy) ::",
      "0.7:: irua ::",
      "0.6:: kedama milk ::",
      "0.5:: nanashi_(nlo) ::",
      "0.45:: ruhika ::",
    ]
  },
  清新: {
    tags: [
      "1.3:: torino_aqua ::",
      "1.2:: peach_candy ::",
      "1.1:: sakimichan ::",
      "0.8:: yukie_ ::",
      "0.75:: masuyama_ryou ::",
      "0.6:: ichiyou_moka ::",
      "0.7:: nii_manabu ::",
      "0.85:: mizuki_makoto ::",
      "0.65:: konya_karasue ::",
      "0.7:: matsunaga_kouyou ::",
      "0.8:: sakura (39ra) ::",
      "0.6:: tyomimas ::",
      "0.78:: ebifurya ::",
      "0.82:: gweda ::",
      "0.6:: shinkai_makoto ::",
    ]
  },
  精致: {
    tags: [
      "1.15:: liduke ::",
      "1.2:: laserflip ::",
      "1.3:: ogipote ::",
      "0.7:: modare ::",
      "0.8:: sho_(sho_lwlw) ::",
      "0.65:: sy4 ::",
      "0.75:: chen bin ::",
      "0.6:: ke-ta ::",
      "0.8:: rei (sanbonzakura) ::",
      "0.7:: atdan ::",
      "0.68:: dishwasher1910 ::",
      "0.85:: hijiri_rei ::",
      "0.7:: tianliang duohe fangdongye ::",
      "0.6:: ishikei ::",
      "0.78:: irua ::",
    ]
  },
  灵动: {
    tags: [
      "1.3:: sakimichan ::",
      "1.2:: anmi ::",
      "1.1:: liduke ::",
      "1.2:: ask_(askzy) ::",
      "0.7:: fuzichoco ::",
      "0.6:: kedama milk ::",
      "0.5:: chaosexceed ::",
      "0.8:: ogipote ::",
      "0.4:: amashiro_natsuki ::",
      "0.6:: irua ::",
      "0.7:: dishwasher1910 ::",
      "0.5:: mana (remana) ::",
      "0.6:: konya_karasue ::",
      "0.7:: saipaco ::",
      "0.5:: yagi_(ningen) ::",
      "0.6:: modare ::",
      "0.4:: peach_candy ::",
    ]
  },
  柔和: {
    tags: [
      "1.2:: sasaame ::",
      "1.1:: coria ::",
      "1.25:: namori ::",
      "0.7:: sofra ::",
      "0.8:: yuuhagi ::",
      "0.65:: amaretto-no-natsu ::",
      "0.75:: esureki ::",
      "0.6:: ruhika ::",
      "0.8:: mauve ::",
      "0.7:: noyu23386566 ::",
      "0.68:: anmi ::",
      "0.85:: yagi_(ningen) ::",
      "0.7:: saipaco ::",
      "0.6:: sukoyaka_(100hituzi) ::",
      "0.72:: kaedeko_(kaedelic) ::",
    ]
  },
  细腻: {
    tags: [
      "1.2:: ningen mame ::",
      "1.1:: anmi ::",
      "1.3:: liduke ::",
      "1.2:: shinkai_makoto ::",
      "0.7:: kedama milk ::",
      "0.6:: irua ::",
      "0.8:: ogipote ::",
      "0.5:: haru_ichigo ::",
      "0.7:: ask_(askzy) ::",
      "0.6:: konya_karasue ::",
      "0.4:: peach_candy ::",
      "0.7:: fuzichoco ::",
      "0.5:: chaosexceed ::",
      "0.6:: dishwasher1910 ::",
      "0.8:: saipaco ::",
    ]
  },
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

function buildAiImageStylePresets(images: Record<string, string>, configById: Record<string, AiImageStyleTagConfig>) {
  const configIds = Object.keys(configById).map(normalizeId).filter(Boolean);

  const imageIds = Object.keys(images)
    .map(path => basenameNoExt(path))
    .map(normalizeId)
    .filter(Boolean);

  const allIds = uniqStrings([...imageIds, ...configIds]);

  return allIds
    .map((id) => {
      const imagePath = Object.keys(images).find(path => basenameNoExt(path) === id);
      const imageUrl = imagePath ? images[imagePath] : undefined;
      const config = configById[id] || {};
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

export function getAiImageStylePresets() {
  const images = import.meta.glob("../assets/ai-image/styles/*.{png,webp,jpg,jpeg}", {
    eager: true,
    import: "default",
  }) as Record<string, string>;

  return buildAiImageStylePresets(images, STYLE_TAGS_BY_ID);
}

export function getAiImageCompareStylePresets() {
  const images = import.meta.glob("../assets/ai-image/compare-styles/*.{png,webp,jpg,jpeg}", {
    eager: true,
    import: "default",
  }) as Record<string, string>;

  return buildAiImageStylePresets(images, COMPARE_STYLE_TAGS_BY_ID);
}
