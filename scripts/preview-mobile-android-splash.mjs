import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const splashSource = path.join(workspaceRoot, "apps/mobile/assets/images/splash-icon.png");
const outputPath = path.join(os.tmpdir(), "tuanchat-android-splash-viewport-preview.png");

const background = { r: 49, g: 51, b: 56, alpha: 1 };
const drawableDp = 216;
const contentDp = 107;
const previewScale = 1;
const phoneWidth = 432;
const phoneHeight = 936;
const drawablePx = drawableDp * previewScale;
const contentPx = contentDp * previewScale;
const displayTop = Math.round(phoneHeight * 0.39);

async function renderPreview() {
  const logo = await sharp(splashSource)
    .ensureAlpha()
    .resize(contentPx, contentPx, { fit: "contain" })
    .png()
    .toBuffer();

  const phone = sharp({
    create: {
      width: phoneWidth,
      height: phoneHeight,
      channels: 4,
      background,
    },
  });

  const compositeLeft = Math.round((phoneWidth - contentPx) / 2);
  const compositeTop = displayTop + Math.round((drawablePx - contentPx) / 2);
  await phone
    .composite([
      {
        input: logo,
        left: compositeLeft,
        top: compositeTop,
      },
      {
        input: Buffer.from(
          `<svg width="${phoneWidth}" height="${phoneHeight}" xmlns="http://www.w3.org/2000/svg">
            <rect x="${Math.round((phoneWidth - drawablePx) / 2)}" y="${displayTop}" width="${drawablePx}" height="${drawablePx}" fill="none" stroke="#55a7ff" stroke-width="2" stroke-dasharray="8 6"/>
          </svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(outputPath);

  return {
    outputPath,
    drawableDp,
    contentDp,
    note: "蓝色虚线框是 Android splash drawable 外框，logo 按 contentDp 居中预览。",
  };
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
console.log(JSON.stringify(await renderPreview(), null, 2));
