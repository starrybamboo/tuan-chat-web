import { unzipSync } from "fflate";
import { Buffer } from "node:buffer";

// 将字节数组编码为 Base64 数据 URL
export function base64DataUrl(mime, bytes) {
  const b64 = Buffer.from(bytes).toString("base64");
  return `data:${mime};base64,${b64}`;
}

// 根据文件名推断 MIME 类型
function mimeFromFilename(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".png"))
    return "image/png";
  if (lower.endsWith(".webp"))
    return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
    return "image/jpeg";
  return "application/octet-stream";
}

// 从 ZIP 文件字节中提取第一张图片并返回其 Base64 数据 URL
export function firstImageFromZip(zipBytes) {
  const files = unzipSync(zipBytes);
  const names = Object.keys(files);
  if (!names.length)
    throw new Error("ZIP 解包失败：未找到任何文件");

  const preferred = names.find(n => /\\.(?:png|webp|jpe?g)$/i.test(n)) || names[0];
  const mime = mimeFromFilename(preferred);
  return base64DataUrl(mime, files[preferred]);
}

// 检查字节数组是否以指定前缀开头
function startsWithBytes(bytes, prefix) {
  if (!bytes || bytes.length < prefix.length)
    return false;
  return prefix.every((b, i) => bytes[i] === b);
}

// 检查字节数组是否看起来像一个 ZIP 文件
export function looksLikeZip(bytes) {
  if (!bytes || bytes.length < 4)
    return false;
  return (
    bytes[0] === 0x50
    && bytes[1] === 0x4B
    && (
      (bytes[2] === 0x03 && bytes[3] === 0x04)
      || (bytes[2] === 0x05 && bytes[3] === 0x06)
      || (bytes[2] === 0x07 && bytes[3] === 0x08)
    )
  );
}

export function detectBinaryDataUrl(bytes) {
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
    return base64DataUrl("image/png", bytes);
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF)
    return base64DataUrl("image/jpeg", bytes);
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
    return base64DataUrl("image/webp", bytes);
  }
  return "";
}
