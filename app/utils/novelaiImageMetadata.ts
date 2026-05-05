import { gunzipSync, strFromU8, unzlibSync } from "fflate";

export type NovelAiImportMode = "txt2img" | "img2img" | "infill";

export type NovelAiImportedCharacterPrompt = {
  prompt: string;
  negativePrompt: string;
  centerX: number;
  centerY: number;
};

export type NovelAiImportedReferenceImage = {
  imageBase64: string;
  strength: number;
  informationExtracted: number;
};

export type NovelAiImportedSettings = {
  mode?: NovelAiImportMode;
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: number;
  width?: number;
  height?: number;
  imageCount?: number;
  steps?: number;
  scale?: number;
  sampler?: string;
  noiseSchedule?: string;
  cfgRescale?: number;
  ucPreset?: number;
  qualityToggle?: boolean;
  dynamicThresholding?: boolean;
  smea?: boolean;
  smeaDyn?: boolean;
  strength?: number;
  noise?: number;
  v4UseCoords?: boolean;
  v4UseOrder?: boolean;
  v4Chars?: NovelAiImportedCharacterPrompt[];
  vibeTransferReferences?: NovelAiImportedReferenceImage[];
  preciseReference?: NovelAiImportedReferenceImage | null;
};

export type NovelAiImageMetadataResult = {
  source: "png-text" | "stealth" | "webp-xmp";
  raw: Record<string, unknown>;
  settings: NovelAiImportedSettings;
};

export type NovelAiStealthImageData = {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
};

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const STEALTH_MAGIC = "stealth_pngcomp";
const utf8Decoder = new TextDecoder("utf-8");
const latin1Decoder = new TextDecoder("latin1");
const utf8Encoder = new TextEncoder();
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1
        ? (0xEDB88320 ^ (value >>> 1))
        : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return null;
  return value as Record<string, unknown>;
}

function safeJsonParse(value: unknown): unknown {
  if (typeof value !== "string")
    return value;
  try {
    return JSON.parse(value);
  }
  catch {
    return value;
  }
}

function readUint32Be(bytes: Uint8Array, offset: number) {
  if (offset + 4 > bytes.length)
    return null;
  return (
    (bytes[offset] << 24)
    | (bytes[offset + 1] << 16)
    | (bytes[offset + 2] << 8)
    | bytes[offset + 3]
  ) >>> 0;
}

function readUint32Le(bytes: Uint8Array, offset: number) {
  if (offset + 4 > bytes.length)
    return null;
  return (
    bytes[offset]
    | (bytes[offset + 1] << 8)
    | (bytes[offset + 2] << 16)
    | (bytes[offset + 3] << 24)
  ) >>> 0;
}

function hasPngSignature(bytes: Uint8Array) {
  if (bytes.length < PNG_SIGNATURE.length)
    return false;
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

function hasWebpSignature(bytes: Uint8Array) {
  return bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50;
}

function decodeLatin1(bytes: Uint8Array) {
  return latin1Decoder.decode(bytes);
}

function decodeUtf8(bytes: Uint8Array) {
  return utf8Decoder.decode(bytes);
}

function encodeUtf8(value: string) {
  return utf8Encoder.encode(value);
}

function concatBytes(...parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

function writeUint32Be(value: number) {
  return new Uint8Array([
    (value >>> 24) & 0xFF,
    (value >>> 16) & 0xFF,
    (value >>> 8) & 0xFF,
    value & 0xFF,
  ]);
}

function writeUint32Le(value: number) {
  return new Uint8Array([
    value & 0xFF,
    (value >>> 8) & 0xFF,
    (value >>> 16) & 0xFF,
    (value >>> 24) & 0xFF,
  ]);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xFFFFFFFF;
  for (let index = 0; index < bytes.length; index += 1) {
    const tableIndex = (crc ^ bytes[index]) & 0xFF;
    crc = (CRC32_TABLE[tableIndex] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makePngChunk(type: string, data: Uint8Array) {
  const typeBytes = encodeUtf8(type);
  const crcValue = crc32(concatBytes(typeBytes, data));
  return concatBytes(
    writeUint32Be(data.length),
    typeBytes,
    data,
    writeUint32Be(crcValue),
  );
}

function makeInternationalTextChunk(key: string, value: string) {
  const keyBytes = encodeUtf8(key);
  const valueBytes = encodeUtf8(value);
  return makePngChunk(
    "iTXt",
    concatBytes(
      keyBytes,
      new Uint8Array([0, 0, 0, 0, 0]),
      valueBytes,
    ),
  );
}

type WebpChunk = {
  type: string;
  data: Uint8Array;
  raw: Uint8Array;
};

function parseWebpChunks(bytes: Uint8Array): WebpChunk[] | null {
  if (!hasWebpSignature(bytes))
    return null;

  const chunks: WebpChunk[] = [];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = decodeLatin1(bytes.subarray(offset, offset + 4));
    const size = readUint32Le(bytes, offset + 4);
    if (size == null)
      break;

    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    const paddedEnd = dataEnd + (size % 2);
    if (dataEnd > bytes.length || paddedEnd > bytes.length)
      break;

    chunks.push({
      type,
      data: bytes.subarray(dataStart, dataEnd),
      raw: bytes.subarray(offset, paddedEnd),
    });
    offset = paddedEnd;
  }

  return chunks;
}

function makeWebpChunk(type: string, data: Uint8Array) {
  const padding = data.length % 2 ? new Uint8Array([0]) : new Uint8Array();
  return concatBytes(
    encodeUtf8(type).subarray(0, 4),
    writeUint32Le(data.length),
    data,
    padding,
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}

const WEBP_NOVELAI_XMP_MARKER = "TC_NOVELAI_METADATA_BASE64:";

function buildNovelAiWebpXmp(metadata: NovelAiImageMetadataResult) {
  const rawJson = JSON.stringify(buildNovelAiPngTextEntries(metadata));
  const encoded = bytesToBase64(encodeUtf8(rawJson));
  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:tc="https://tuan.chat/ns/novelai/1.0/">
      <tc:NovelAI>${WEBP_NOVELAI_XMP_MARKER}${encoded}</tc:NovelAI>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

function parseNovelAiWebpXmp(data: Uint8Array): NovelAiImageMetadataResult | null {
  const text = decodeUtf8(data);
  const match = new RegExp(`${WEBP_NOVELAI_XMP_MARKER}([A-Za-z0-9+/=]+)`).exec(text);
  if (!match)
    return null;

  try {
    const rawValue = JSON.parse(decodeUtf8(base64ToBytes(match[1])));
    const rawRecord = asRecord(rawValue);
    if (!rawRecord)
      return null;
    const normalizedRaw = normalizeRawMetadata(rawRecord);
    const settings = normalizeNovelAiMetadata(normalizedRaw);
    if (!settings)
      return null;
    return {
      source: "webp-xmp",
      raw: normalizedRaw,
      settings,
    };
  }
  catch {
    return null;
  }
}

function parseTextChunk(chunkType: string, chunkData: Uint8Array) {
  const keywordEnd = chunkData.indexOf(0);
  if (keywordEnd <= 0)
    return null;

  const key = decodeLatin1(chunkData.subarray(0, keywordEnd));
  if (!key)
    return null;

  try {
    if (chunkType === "tEXt") {
      return {
        key,
        value: decodeLatin1(chunkData.subarray(keywordEnd + 1)),
      };
    }

    if (chunkType === "zTXt") {
      const compressionMethod = chunkData[keywordEnd + 1];
      if (compressionMethod !== 0)
        return null;
      const value = decodeLatin1(unzlibSync(chunkData.subarray(keywordEnd + 2)));
      return { key, value };
    }

    if (chunkType === "iTXt") {
      let cursor = keywordEnd + 1;
      if (cursor + 2 > chunkData.length)
        return null;
      const compressionFlag = chunkData[cursor];
      const compressionMethod = chunkData[cursor + 1];
      cursor += 2;

      const languageEnd = chunkData.indexOf(0, cursor);
      if (languageEnd < 0)
        return null;
      cursor = languageEnd + 1;

      const translatedKeywordEnd = chunkData.indexOf(0, cursor);
      if (translatedKeywordEnd < 0)
        return null;
      cursor = translatedKeywordEnd + 1;

      const textBytes = chunkData.subarray(cursor);
      const valueBytes = compressionFlag === 1
        ? (compressionMethod === 0 ? unzlibSync(textBytes) : null)
        : textBytes;
      if (!valueBytes)
        return null;

      return {
        key,
        value: decodeUtf8(valueBytes),
      };
    }
  }
  catch {
    return null;
  }

  return null;
}

function parsePngTextEntries(bytes: Uint8Array) {
  if (!hasPngSignature(bytes))
    return null;

  const entries: Record<string, unknown> = {};
  let offset = PNG_SIGNATURE.length;

  while (offset + 12 <= bytes.length) {
    const chunkLength = readUint32Be(bytes, offset);
    if (chunkLength == null)
      break;

    const typeStart = offset + 4;
    const typeEnd = typeStart + 4;
    const dataStart = typeEnd;
    const dataEnd = dataStart + chunkLength;
    const crcEnd = dataEnd + 4;
    if (crcEnd > bytes.length)
      break;

    const chunkType = decodeLatin1(bytes.subarray(typeStart, typeEnd));
    if (chunkType === "tEXt" || chunkType === "zTXt" || chunkType === "iTXt") {
      const parsed = parseTextChunk(chunkType, bytes.subarray(dataStart, dataEnd));
      if (parsed)
        entries[parsed.key] = parsed.value;
    }

    offset = crcEnd;
    if (chunkType === "IEND")
      break;
  }

  return Object.keys(entries).length ? entries : null;
}

function getPathValue(value: unknown, path: readonly (string | number)[]) {
  let current: unknown = value;
  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(current) || segment < 0 || segment >= current.length)
        return undefined;
      current = current[segment];
      continue;
    }

    const currentRecord = asRecord(current);
    if (!currentRecord || !(segment in currentRecord))
      return undefined;
    current = currentRecord[segment];
  }
  return current;
}

function readFirst(root: unknown, paths: readonly (readonly (string | number)[])[]) {
  for (const path of paths) {
    const value = getPathValue(root, path);
    if (value != null)
      return value;
  }
  return undefined;
}

function toStringValue(value: unknown) {
  if (typeof value === "string")
    return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return undefined;
}

function toNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value))
    return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed)
      return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toBooleanValue(value: unknown) {
  if (typeof value === "boolean")
    return value;
  if (typeof value === "number")
    return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1")
      return true;
    if (normalized === "false" || normalized === "0")
      return false;
  }
  return undefined;
}

function readString(root: unknown, paths: readonly (readonly (string | number)[])[]) {
  const value = readFirst(root, paths);
  return toStringValue(value);
}

function readNumber(root: unknown, paths: readonly (readonly (string | number)[])[]) {
  const value = readFirst(root, paths);
  return toNumberValue(value);
}

function readInteger(root: unknown, paths: readonly (readonly (string | number)[])[]) {
  const value = readNumber(root, paths);
  return value == null ? undefined : Math.trunc(value);
}

function readBoolean(root: unknown, paths: readonly (readonly (string | number)[])[]) {
  const value = readFirst(root, paths);
  return toBooleanValue(value);
}

function clamp01(value: number, fallback = 0.5) {
  if (!Number.isFinite(value))
    return fallback;
  return Math.max(0, Math.min(1, value));
}

function stripEmptyString(value: string | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed || undefined;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value))
    return [];
  return value
    .map(item => stripEmptyString(toStringValue(item)))
    .filter(Boolean) as string[];
}

function readNumberArray(value: unknown) {
  if (!Array.isArray(value))
    return [];
  return value
    .map(item => toNumberValue(item))
    .filter((item): item is number => item != null);
}

function normalizeReferenceImage(imageBase64: string, strength?: number, informationExtracted?: number) {
  const base64 = stripImageDataUrlPrefix(imageBase64);
  if (!base64)
    return null;

  return {
    imageBase64: base64,
    strength: clamp01(strength ?? 1, 1),
    informationExtracted: clamp01(informationExtracted ?? 1, 1),
  } satisfies NovelAiImportedReferenceImage;
}

function readCenter(value: unknown) {
  const center = asRecord(value);
  if (center) {
    return {
      centerX: clamp01(toNumberValue(center.x) ?? 0.5, 0.5),
      centerY: clamp01(toNumberValue(center.y) ?? 0.5, 0.5),
    };
  }

  if (Array.isArray(value) && value.length) {
    const first = asRecord(value[0]);
    if (!first)
      return { centerX: 0.5, centerY: 0.5 };
    return {
      centerX: clamp01(toNumberValue(first.x) ?? 0.5, 0.5),
      centerY: clamp01(toNumberValue(first.y) ?? 0.5, 0.5),
    };
  }

  return {
    centerX: 0.5,
    centerY: 0.5,
  };
}

function extractV4Characters(root: Record<string, unknown>) {
  const characterPrompts = getPathValue(root, ["parameters", "characterPrompts"]) ?? getPathValue(root, ["characterPrompts"]);
  if (Array.isArray(characterPrompts) && characterPrompts.length) {
    const rows = characterPrompts
      .map((item) => {
        const record = asRecord(item);
        if (!record)
          return null;
        const center = readCenter(record.center ?? record.centers);
        return {
          prompt: String(record.prompt ?? record.char_caption ?? ""),
          negativePrompt: String(record.negativePrompt ?? record.negative_prompt ?? ""),
          centerX: center.centerX,
          centerY: center.centerY,
        } satisfies NovelAiImportedCharacterPrompt;
      })
      .filter(Boolean) as NovelAiImportedCharacterPrompt[];
    if (rows.length)
      return rows;
  }

  const positive = getPathValue(root, ["parameters", "v4_prompt", "caption", "char_captions"])
    ?? getPathValue(root, ["v4_prompt", "caption", "char_captions"]);
  const negative = getPathValue(root, ["parameters", "v4_negative_prompt", "caption", "char_captions"])
    ?? getPathValue(root, ["v4_negative_prompt", "caption", "char_captions"]);

  if (!Array.isArray(positive) && !Array.isArray(negative))
    return undefined;

  const maxLength = Math.max(
    Array.isArray(positive) ? positive.length : 0,
    Array.isArray(negative) ? negative.length : 0,
  );
  const rows: NovelAiImportedCharacterPrompt[] = [];
  for (let index = 0; index < maxLength; index += 1) {
    const positiveRecord = asRecord(Array.isArray(positive) ? positive[index] : null);
    const negativeRecord = asRecord(Array.isArray(negative) ? negative[index] : null);
    const center = readCenter(positiveRecord?.centers ?? negativeRecord?.centers);
    rows.push({
      prompt: String(positiveRecord?.char_caption ?? positiveRecord?.prompt ?? ""),
      negativePrompt: String(negativeRecord?.char_caption ?? negativeRecord?.prompt ?? ""),
      centerX: center.centerX,
      centerY: center.centerY,
    });
  }
  return rows;
}

function extractReferenceImages(root: Record<string, unknown>) {
  const rawImages = getPathValue(root, ["parameters", "reference_image_multiple"])
    ?? getPathValue(root, ["reference_image_multiple"]);
  const images = readStringArray(rawImages);
  if (!images.length)
    return undefined;

  const rawStrengths = getPathValue(root, ["parameters", "reference_strength_multiple"])
    ?? getPathValue(root, ["reference_strength_multiple"]);
  const strengths = readNumberArray(rawStrengths);
  const rawInformationExtracted = getPathValue(root, ["parameters", "reference_information_extracted_multiple"])
    ?? getPathValue(root, ["reference_information_extracted_multiple"]);
  const informationExtracted = readNumberArray(rawInformationExtracted);

  return images
    .map((imageBase64, index) =>
      normalizeReferenceImage(
        imageBase64,
        strengths[index],
        informationExtracted[index],
      ))
    .filter(Boolean) as NovelAiImportedReferenceImage[];
}

function extractPreciseReference(root: Record<string, unknown>) {
  const imageBase64 = readString(root, [
    ["parameters", "reference_image"],
    ["reference_image"],
  ]);
  if (!imageBase64)
    return undefined;

  return normalizeReferenceImage(
    imageBase64,
    readNumber(root, [
      ["parameters", "reference_strength"],
      ["reference_strength"],
    ]),
    readNumber(root, [
      ["parameters", "reference_information_extracted"],
      ["reference_information_extracted"],
    ]),
  );
}

function stripImageDataUrlPrefix(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed)
    return "";

  const match = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

export function decodeBase64Prefix(value: string, byteCount = 16) {
  const normalized = stripImageDataUrlPrefix(value).replace(/\s+/g, "");
  if (!normalized)
    return new Uint8Array();

  try {
    const paddedLength = Math.ceil((byteCount * 4) / 3);
    const binary = atob(normalized.slice(0, paddedLength));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  catch {
    return new Uint8Array();
  }
}

export function detectImageMime(bytes: Uint8Array) {
  if (bytes.length >= 8 && PNG_SIGNATURE.every((value, index) => bytes[index] === value))
    return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF)
    return "image/jpeg";
  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return "image/png";
}

export function normalizeNovelAiMetadata(raw: unknown): NovelAiImportedSettings | null {
  const rawRecord = asRecord(raw);
  if (!rawRecord)
    return null;

  const parsedComment = safeJsonParse(rawRecord.Comment);
  const commentRecord = asRecord(parsedComment);
  const mergedRoot = commentRecord ? { ...rawRecord, ...commentRecord } : rawRecord;

  const settings: NovelAiImportedSettings = {};
  let recognized = 0;

  const mode = readString(mergedRoot, [["action"]]);
  const hasImageInput = Boolean(readString(mergedRoot, [["parameters", "image"], ["image"]]));
  const hasMaskInput = Boolean(readString(mergedRoot, [["parameters", "mask"], ["mask"]]));
  if (mode === "generate" || mode === "txt2img") {
    settings.mode = "txt2img";
    recognized += 1;
  }
  else if (mode === "infill" || hasMaskInput) {
    settings.mode = "infill";
    recognized += 1;
  }
  else if (mode === "img2img" || hasImageInput) {
    settings.mode = "img2img";
    recognized += 1;
  }

  const prompt = stripEmptyString(readString(mergedRoot, [
    ["input"],
    ["prompt"],
    ["parameters", "prompt"],
    ["parameters", "v4_prompt", "caption", "base_caption"],
    ["v4_prompt", "caption", "base_caption"],
  ]));
  if (prompt != null) {
    settings.prompt = prompt;
    recognized += 1;
  }

  const negativePrompt = stripEmptyString(readString(mergedRoot, [
    ["parameters", "negative_prompt"],
    ["negative_prompt"],
    ["parameters", "v4_negative_prompt", "caption", "base_caption"],
    ["v4_negative_prompt", "caption", "base_caption"],
  ]));
  if (negativePrompt != null) {
    settings.negativePrompt = negativePrompt;
    recognized += 1;
  }

  const model = stripEmptyString(readString(mergedRoot, [["model"], ["parameters", "model"]]));
  if (model != null) {
    settings.model = model;
    recognized += 1;
  }

  const numericFields = [
    ["seed", [["parameters", "seed"], ["seed"]]],
    ["width", [["parameters", "width"], ["width"]]],
    ["height", [["parameters", "height"], ["height"]]],
    ["imageCount", [["parameters", "n_samples"], ["n_samples"], ["parameters", "imageCount"], ["imageCount"]]],
    ["steps", [["parameters", "steps"], ["steps"]]],
    ["scale", [["parameters", "scale"], ["scale"], ["parameters", "cfg_scale"], ["cfg_scale"]]],
    ["cfgRescale", [["parameters", "cfg_rescale"], ["cfg_rescale"], ["parameters", "cfgRescale"], ["cfgRescale"]]],
    ["ucPreset", [["parameters", "ucPreset"], ["ucPreset"]]],
    ["strength", [["parameters", "strength"], ["strength"]]],
    ["noise", [["parameters", "noise"], ["noise"]]],
  ] as const;

  for (const [fieldName, paths] of numericFields) {
    const value = fieldName === "seed" || fieldName === "imageCount" || fieldName === "steps" || fieldName === "ucPreset"
      ? readInteger(mergedRoot, paths)
      : readNumber(mergedRoot, paths);
    if (value == null)
      continue;
    (settings as Record<string, unknown>)[fieldName] = value;
    recognized += 1;
  }

  const sampler = stripEmptyString(readString(mergedRoot, [
    ["parameters", "sampler"],
    ["sampler"],
    ["parameters", "sampler_name"],
    ["sampler_name"],
  ]));
  if (sampler != null) {
    settings.sampler = sampler;
    recognized += 1;
  }

  const noiseSchedule = stripEmptyString(readString(mergedRoot, [
    ["parameters", "noise_schedule"],
    ["noise_schedule"],
    ["parameters", "scheduler"],
    ["scheduler"],
  ]));
  if (noiseSchedule != null) {
    settings.noiseSchedule = noiseSchedule;
    recognized += 1;
  }

  const booleanFields = [
    ["qualityToggle", [["parameters", "qualityToggle"], ["qualityToggle"], ["parameters", "quality_toggle"], ["quality_toggle"]]],
    ["dynamicThresholding", [["parameters", "dynamic_thresholding"], ["dynamic_thresholding"], ["parameters", "decrisper"], ["decrisper"]]],
    ["smea", [["parameters", "sm"], ["sm"]]],
    ["smeaDyn", [["parameters", "sm_dyn"], ["sm_dyn"]]],
    ["v4UseCoords", [["parameters", "v4_prompt", "use_coords"], ["v4_prompt", "use_coords"], ["parameters", "use_coords"], ["use_coords"]]],
    ["v4UseOrder", [["parameters", "v4_prompt", "use_order"], ["v4_prompt", "use_order"]]],
  ] as const;

  for (const [fieldName, paths] of booleanFields) {
    const value = readBoolean(mergedRoot, paths);
    if (value == null)
      continue;
    (settings as Record<string, unknown>)[fieldName] = value;
    recognized += 1;
  }

  const v4Chars = extractV4Characters(mergedRoot);
  if (v4Chars != null) {
    settings.v4Chars = v4Chars;
    recognized += 1;
  }

  const vibeTransferReferences = extractReferenceImages(mergedRoot);
  if (vibeTransferReferences != null) {
    settings.vibeTransferReferences = vibeTransferReferences;
    recognized += 1;
  }

  const preciseReference = extractPreciseReference(mergedRoot);
  if (preciseReference !== undefined) {
    settings.preciseReference = preciseReference;
    recognized += 1;
  }

  return recognized ? settings : null;
}

function normalizeRawMetadata(raw: Record<string, unknown>) {
  const next = { ...raw };
  next.Comment = safeJsonParse(next.Comment);
  return next;
}

function serializeMetadataTextValue(value: unknown) {
  if (typeof value === "string")
    return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value == null)
    return null;
  try {
    return JSON.stringify(value);
  }
  catch {
    return null;
  }
}

function buildNovelAiPngTextEntries(metadata: NovelAiImageMetadataResult) {
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata.raw)) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey)
      continue;
    const serializedValue = serializeMetadataTextValue(value);
    if (serializedValue != null)
      entries[normalizedKey] = serializedValue;
  }

  if (!entries.Source)
    entries.Source = "NovelAI";

  if (!entries.Comment) {
    const fallbackComment = serializeMetadataTextValue(metadata.raw);
    if (fallbackComment != null)
      entries.Comment = fallbackComment;
  }

  return entries;
}

export function extractNovelAiMetadataFromPngBytes(bytes: Uint8Array): NovelAiImageMetadataResult | null {
  const rawEntries = parsePngTextEntries(bytes);
  if (!rawEntries)
    return null;

  const normalizedRaw = normalizeRawMetadata(rawEntries);
  const settings = normalizeNovelAiMetadata(normalizedRaw);
  if (!settings)
    return null;

  return {
    source: "png-text",
    raw: normalizedRaw,
    settings,
  };
}

export function extractNovelAiMetadataFromWebpBytes(bytes: Uint8Array): NovelAiImageMetadataResult | null {
  const chunks = parseWebpChunks(bytes);
  if (!chunks)
    return null;

  for (const chunk of chunks) {
    if (chunk.type !== "XMP ")
      continue;
    const result = parseNovelAiWebpXmp(chunk.data);
    if (result)
      return result;
  }
  return null;
}

function collectStealthBytes(image: NovelAiStealthImageData) {
  const { width, height, data } = image;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0)
    return new Uint8Array();
  if (data.length < width * height * 4)
    return new Uint8Array();

  const totalPixels = width * height;
  const usablePixels = Math.floor(totalPixels / 8) * 8;
  const collected = new Uint8Array(usablePixels / 8);

  let byteValue = 0;
  let bitCount = 0;
  let outputIndex = 0;
  let pixelCount = 0;

  // NovelAI writes stealth metadata into alpha LSBs column by column.
  for (let x = 0; x < width && pixelCount < usablePixels; x += 1) {
    for (let y = 0; y < height && pixelCount < usablePixels; y += 1) {
      const alpha = data[(y * width + x) * 4 + 3] ?? 0;
      byteValue = (byteValue << 1) | (alpha & 1);
      bitCount += 1;
      pixelCount += 1;

      if (bitCount === 8) {
        collected[outputIndex] = byteValue;
        outputIndex += 1;
        bitCount = 0;
        byteValue = 0;
      }
    }
  }

  return collected;
}

export function extractNovelAiMetadataFromStealthPixels(image: NovelAiStealthImageData): NovelAiImageMetadataResult | null {
  const packedBytes = collectStealthBytes(image);
  if (packedBytes.length < STEALTH_MAGIC.length + 4)
    return null;

  const magic = decodeUtf8(packedBytes.subarray(0, STEALTH_MAGIC.length));
  if (magic !== STEALTH_MAGIC)
    return null;

  const bitLength = readUint32Be(packedBytes, STEALTH_MAGIC.length);
  if (bitLength == null || bitLength <= 0)
    return null;

  const payloadLength = Math.floor(bitLength / 8);
  const payloadStart = STEALTH_MAGIC.length + 4;
  const payloadEnd = payloadStart + payloadLength;
  if (payloadEnd > packedBytes.length)
    return null;

  try {
    const rawValue = safeJsonParse(strFromU8(gunzipSync(packedBytes.subarray(payloadStart, payloadEnd))));
    const rawRecord = asRecord(rawValue);
    if (!rawRecord)
      return null;

    const normalizedRaw = normalizeRawMetadata(rawRecord);
    const settings = normalizeNovelAiMetadata(normalizedRaw);
    if (!settings)
      return null;

    return {
      source: "stealth",
      raw: normalizedRaw,
      settings,
    };
  }
  catch {
    return null;
  }
}

export function embedNovelAiMetadataIntoPngBytes(
  imageBytes: Uint8Array,
  metadata: NovelAiImageMetadataResult | null,
): Uint8Array {
  if (!metadata || !hasPngSignature(imageBytes))
    return imageBytes;

  const textChunks = Object.entries(buildNovelAiPngTextEntries(metadata))
    .map(([key, value]) => makeInternationalTextChunk(key, value));
  if (!textChunks.length)
    return imageBytes;

  const outputChunks: Uint8Array[] = [PNG_SIGNATURE];
  let offset = PNG_SIGNATURE.length;
  let inserted = false;

  while (offset + 12 <= imageBytes.length) {
    const chunkLength = readUint32Be(imageBytes, offset);
    if (chunkLength == null)
      break;

    const typeStart = offset + 4;
    const typeEnd = typeStart + 4;
    const dataEnd = typeEnd + chunkLength;
    const crcEnd = dataEnd + 4;
    if (crcEnd > imageBytes.length)
      break;

    const chunkType = decodeLatin1(imageBytes.subarray(typeStart, typeEnd));
    const chunkBytes = imageBytes.subarray(offset, crcEnd);

    if (chunkType === "IEND") {
      outputChunks.push(...textChunks);
      outputChunks.push(chunkBytes);
      inserted = true;
      break;
    }

    if (chunkType !== "tEXt" && chunkType !== "zTXt" && chunkType !== "iTXt")
      outputChunks.push(chunkBytes);

    offset = crcEnd;
  }

  return inserted ? concatBytes(...outputChunks) : imageBytes;
}

export function embedNovelAiMetadataIntoWebpBytes(
  imageBytes: Uint8Array,
  metadata: NovelAiImageMetadataResult | null,
): Uint8Array {
  if (!metadata || !hasWebpSignature(imageBytes))
    return imageBytes;

  const chunks = parseWebpChunks(imageBytes);
  if (!chunks?.length)
    return imageBytes;

  const xmpBytes = encodeUtf8(buildNovelAiWebpXmp(metadata));
  const xmpChunk = makeWebpChunk("XMP ", xmpBytes);
  const keptChunks = chunks
    .filter(chunk => chunk.type !== "XMP " || !parseNovelAiWebpXmp(chunk.data))
    .map(chunk => chunk.raw);
  const body = concatBytes(...keptChunks, xmpChunk);
  return concatBytes(
    encodeUtf8("RIFF"),
    writeUint32Le(4 + body.length),
    encodeUtf8("WEBP"),
    body,
  );
}
