// @ts-expect-error lz-string CJS 子路径未提供类型声明
import * as lzNamespace from "lz-string/libs/lz-string.js";

type LzApi = {
  compressToBase64?: (input: string | null) => string;
  decompressFromBase64?: (input: string | null) => string | null;
  compressToUTF16?: (input: string | null) => string;
  decompressFromUTF16?: (input: string | null) => string | null;
  compressToUint8Array?: (input: string) => Uint8Array;
  decompressFromUint8Array?: (input: Uint8Array | null | undefined) => string | null;
  compressToEncodedURIComponent?: (input: string | null) => string;
  decompressFromEncodedURIComponent?: (input: string | null) => string | null;
  compress?: (input: string | null) => string;
  decompress?: (input: string | null) => string | null;
};

const lzCandidates = [
  lzNamespace as unknown as LzApi,
  (lzNamespace as any)?.default as LzApi | undefined,
  (lzNamespace as any)?.default?.default as LzApi | undefined,
].filter(Boolean) as LzApi[];

const RAW_FALLBACK_PREFIX = "__TC_LZ_RAW__:";

function getMethod<K extends keyof LzApi>(name: K): NonNullable<LzApi[K]> | null {
  for (const candidate of lzCandidates) {
    const fn = candidate?.[name];
    if (typeof fn === "function") {
      return fn.bind(candidate) as NonNullable<LzApi[K]>;
    }
  }
  return null;
}

export function compressToBase64(input: string | null) {
  const method = getMethod("compressToBase64");
  if (method) {
    return method(input);
  }
  try {
    return btoa(unescape(encodeURIComponent(String(input ?? ""))));
  }
  catch {
    return "";
  }
}

export function decompressFromBase64(input: string | null) {
  const method = getMethod("decompressFromBase64");
  if (method) {
    return method(input);
  }
  try {
    return decodeURIComponent(escape(atob(String(input ?? ""))));
  }
  catch {
    return null;
  }
}

export function compressToUTF16(input: string | null) {
  const method = getMethod("compressToUTF16");
  return method ? method(input) : String(input ?? "");
}

export function decompressFromUTF16(input: string | null) {
  const method = getMethod("decompressFromUTF16");
  return method ? method(input) : String(input ?? "");
}

export function compressToUint8Array(input: string) {
  const method = getMethod("compressToUint8Array");
  if (method) {
    return method(input);
  }
  return new TextEncoder().encode(String(input ?? ""));
}

export function decompressFromUint8Array(input: Uint8Array | null | undefined) {
  const method = getMethod("decompressFromUint8Array");
  if (method) {
    return method(input);
  }
  if (!input) {
    return null;
  }
  return new TextDecoder().decode(input);
}

export function compressToEncodedURIComponent(input: string | null) {
  const method = getMethod("compressToEncodedURIComponent");
  if (method) {
    try {
      return method(input);
    }
    catch {
      // ignore and fallback
    }
  }
  const raw = String(input ?? "");
  return `${RAW_FALLBACK_PREFIX}${encodeURIComponent(raw)}`;
}

export function decompressFromEncodedURIComponent(input: string | null) {
  const rawInput = String(input ?? "");
  if (rawInput.startsWith(RAW_FALLBACK_PREFIX)) {
    const encoded = rawInput.slice(RAW_FALLBACK_PREFIX.length);
    try {
      return decodeURIComponent(encoded);
    }
    catch {
      return encoded;
    }
  }

  const method = getMethod("decompressFromEncodedURIComponent");
  if (method) {
    try {
      return method(input);
    }
    catch {
      // ignore and fallback
    }
  }

  try {
    return decodeURIComponent(rawInput);
  }
  catch {
    return rawInput || null;
  }
}

export function compress(input: string | null) {
  const method = getMethod("compress");
  return method ? method(input) : String(input ?? "");
}

export function decompress(input: string | null) {
  const method = getMethod("decompress");
  return method ? method(input) : String(input ?? "");
}

export default {
  compressToBase64,
  decompressFromBase64,
  compressToUTF16,
  decompressFromUTF16,
  compressToUint8Array,
  decompressFromUint8Array,
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
  compress,
  decompress,
};
