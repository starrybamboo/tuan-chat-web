import type { AiImageDebugBundleRequest } from "@tuanchat/electron-ipc";

import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";

function decodeImageInputToBuffer(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const dataUrlMatch = /^data:.*?;base64,(.+)$/i.exec(raw);
  const base64 = dataUrlMatch ? dataUrlMatch[1] : raw;
  try {
    return Buffer.from(base64, "base64");
  }
  catch {
    return null;
  }
}

function sanitizeDebugSegment(value: unknown) {
  const sanitized = Array.from(String(value || "").trim(), (char) => {
    if (char.charCodeAt(0) < 0x20) {
      return "-";
    }
    return /[<>:"/\\|?*]/.test(char) ? "-" : char;
  }).join("");

  return sanitized
    .replace(/\s+/g, "-")
    .slice(0, 48) || "debug";
}

export function writeAiImageDebugBundle(rootDir: string, payload: AiImageDebugBundleRequest) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const category = sanitizeDebugSegment(payload?.category || "debug");
  const targetDir = path.join(rootDir, `${timestamp}_${category}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const binaryTargets: Array<[string, unknown]> = [
    ["source.png", payload?.sourceDataUrl],
    ["mask-ui.png", payload?.uiMaskDataUrl],
    ["mask-request.png", payload?.requestMaskDataUrl],
  ];

  for (const [fileName, data] of binaryTargets) {
    const buffer = decodeImageInputToBuffer(data);
    if (buffer)
      fs.writeFileSync(path.join(targetDir, fileName), buffer);
  }

  fs.writeFileSync(
    path.join(targetDir, "request.json"),
    JSON.stringify(payload?.requestBody ?? {}, null, 2),
    "utf8",
  );

  return targetDir;
}
