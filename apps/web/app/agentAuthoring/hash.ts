import type { AuthoringSourceMetadata } from "./contracts";

import { assertNonEmptyString } from "./contracts";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => {
    const serialized = stableStringify(record[key]);
    return `${JSON.stringify(key)}:${serialized}`;
  }).join(",")}}`;
}

export function buildStableInputHash(input: unknown): string {
  const text = typeof input === "string" ? input : stableStringify(input);
  let hash = 0xCBF29CE484222325n;
  const prime = 0x100000001B3n;
  for (let index = 0; index < text.length; index++) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return `fnv64:${hash.toString(16).padStart(16, "0")}`;
}

export function normalizeAuthoringSource(source: AuthoringSourceMetadata): AuthoringSourceMetadata & { key: string } {
  const kind = assertNonEmptyString(source.kind, "source.kind");
  const key = source.key?.trim()
    || [kind, source.workId, source.segmentId, source.url, source.title]
      .filter(item => typeof item === "string" && item.trim())
      .join(":");
  return {
    ...source,
    kind,
    key: assertNonEmptyString(key, "source.key"),
  };
}

export function buildBatchDedupeKey(params: {
  inputHash: string;
  source: AuthoringSourceMetadata & { key: string };
  targetRoomId: number;
}): string {
  return `${params.targetRoomId}:${params.source.kind}:${params.source.key}:${params.inputHash}`;
}
