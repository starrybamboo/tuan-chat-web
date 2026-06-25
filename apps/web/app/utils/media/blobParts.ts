export function copyBytesToBlobPart(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}
