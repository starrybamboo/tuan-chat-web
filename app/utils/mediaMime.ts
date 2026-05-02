import type { MediaType } from "@/utils/imgCompressUtils";

const GENERIC_MIME_TYPES = new Set(["", "application/octet-stream", "binary/octet-stream"]);

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  gz: "application/gzip",
  zip: "application/zip",
};

const MEDIA_TYPE_PREFIXES: Record<MediaType, string> = {
  image: "image/",
  audio: "audio/",
  video: "video/",
  document: "application/",
  other: "",
};

const IMAGE_MIME_ALIASES = new Set(["image/heic", "image/heif"]);
const AUDIO_MIME_ALIASES = new Set(["application/ogg", "application/x-ogg", "audio/x-wav", "audio/wave", "audio/x-m4a"]);
const VIDEO_MIME_ALIASES = new Set(["application/x-matroska", "application/vnd.rn-realmedia-vbr"]);

export type ExpectedMediaType = MediaType | "any";

export type NormalizeFileMimeTypeOptions = {
  expectedMediaType?: ExpectedMediaType;
};

export function normalizeMimeType(mimeType: string | null | undefined): string {
  const normalized = String(mimeType ?? "").trim().toLowerCase();
  const [head] = normalized.split(";", 1);
  if (head === "binary/octet-stream") {
    return "application/octet-stream";
  }
  return head;
}

export function isGenericMimeType(mimeType: string | null | undefined): boolean {
  return GENERIC_MIME_TYPES.has(normalizeMimeType(mimeType));
}

export function inferMimeTypeFromFileName(fileName: string | null | undefined, expectedMediaType: ExpectedMediaType = "any"): string | undefined {
  const normalizedName = String(fileName ?? "").trim().toLowerCase();
  if (!normalizedName) {
    return undefined;
  }

  if (expectedMediaType !== "any") {
    const expectedPrefix = MEDIA_TYPE_PREFIXES[expectedMediaType];
    if (expectedMediaType === "image" && normalizedName.endsWith(".gif")) {
      return "image/gif";
    }
    if (normalizedName.endsWith(".webm")) {
      if (expectedMediaType === "audio") {
        return "audio/webm";
      }
      if (expectedMediaType === "video") {
        return "video/webm";
      }
    }
    if (normalizedName.endsWith(".mov") && expectedMediaType === "video") {
      return "video/quicktime";
    }
    if (expectedPrefix) {
      const ext = normalizedName.match(/\.([a-z0-9]+)(?:[?#].*)?$/)?.[1];
      if (ext) {
        const inferred = MIME_BY_EXTENSION[ext];
        if (inferred && inferred.startsWith(expectedPrefix)) {
          return inferred;
        }
      }
    }
  }

  if (normalizedName.endsWith(".json.gz")) {
    return "application/gzip";
  }

  const ext = normalizedName.match(/\.([a-z0-9]+)(?:[?#].*)?$/)?.[1];
  if (!ext) {
    return undefined;
  }
  return MIME_BY_EXTENSION[ext];
}

export async function inferMimeTypeFromBlob(blob: Blob, fileName?: string | null, expectedMediaType: ExpectedMediaType = "any"): Promise<string | undefined> {
  const byName = inferMimeTypeFromFileName(fileName, expectedMediaType);
  if (byName) {
    return byName;
  }

  const bytes = new Uint8Array(await blob.slice(0, 32).arrayBuffer());
  if (bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4E
    && bytes[3] === 0x47
    && bytes[4] === 0x0D
    && bytes[5] === 0x0A
    && bytes[6] === 0x1A
    && bytes[7] === 0x0A) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return "image/jpeg";
  }
  if (bytes.length >= 6) {
    const gifHeader = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
    if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
      return "image/gif";
    }
  }
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const fourCc = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (riff === "RIFF" && fourCc === "WEBP") {
      return "image/webp";
    }
    if (riff === "RIFF" && fourCc === "WAVE") {
      return "audio/wav";
    }
  }
  if (bytes.length >= 12) {
    const atom = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (atom === "ftyp") {
      const majorBrand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
      if (majorBrand === "avif" || majorBrand === "avis") {
        return "image/avif";
      }
      if (["heic", "heix", "hevc", "hevx"].includes(majorBrand)) {
        return "image/heic";
      }
      if (majorBrand === "mif1" || majorBrand === "msf1") {
        return "image/heif";
      }
      return expectedMediaType === "audio" ? "audio/mp4" : "video/mp4";
    }
  }
  if (bytes.length >= 4
    && bytes[0] === 0x1A
    && bytes[1] === 0x45
    && bytes[2] === 0xDF
    && bytes[3] === 0xA3) {
    return expectedMediaType === "audio" ? "audio/webm" : "video/webm";
  }
  if (bytes.length >= 4
    && bytes[0] === 0x49
    && bytes[1] === 0x44
    && bytes[2] === 0x33) {
    return "audio/mpeg";
  }
  return undefined;
}

export function inferMediaTypeFromMimeType(mimeType: string | null | undefined): MediaType {
  const normalized = normalizeMimeType(mimeType);
  if (normalized.startsWith("image/") || IMAGE_MIME_ALIASES.has(normalized)) {
    return "image";
  }
  if (normalized.startsWith("audio/") || AUDIO_MIME_ALIASES.has(normalized)) {
    return "audio";
  }
  if (normalized.startsWith("video/") || VIDEO_MIME_ALIASES.has(normalized)) {
    return "video";
  }
  if (normalized === "application/pdf" || normalized.startsWith("text/")) {
    return "document";
  }
  return "other";
}

export async function normalizeFileMimeType(
  file: File,
  options: NormalizeFileMimeTypeOptions = {},
): Promise<File> {
  const currentType = normalizeMimeType(file.type);
  const expectedMediaType = options.expectedMediaType ?? "any";
  const currentMediaType = inferMediaTypeFromMimeType(currentType);
  const currentMatchesExpected = expectedMediaType === "any"
    || currentMediaType === expectedMediaType;

  if (!isGenericMimeType(currentType) && currentMatchesExpected) {
    return file;
  }

  const inferred = await inferMimeTypeFromBlob(file, file.name, expectedMediaType);
  const nextType = inferred ?? "application/octet-stream";
  if (nextType === currentType) {
    return file;
  }

  return new File([file], file.name, {
    type: nextType,
    lastModified: file.lastModified,
  });
}
