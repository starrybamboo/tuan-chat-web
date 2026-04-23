import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const publicEffectsDir = path.join(repoRoot, "public", "annotations", "effects");
const templateEffectsDir = path.join(
  repoRoot,
  "extraResources",
  "assets",
  "templates",
  "WebGAL_Template",
  "game",
  "tex",
  "effects",
);
const previewDir = path.join(repoRoot, "..", ".codex-tmp", "generated-annotation-effects");

const paintOrder = `paint-order="stroke fill markers"`;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value) {
  const t = clamp(value, 0, 1);
  return 1 - (1 - t) ** 3;
}

function fadeOutTail(progress, start = 0.84) {
  if (progress <= start) {
    return 1;
  }
  return clamp(1 - (progress - start) / (1 - start), 0, 1);
}

function bubbleSettle(progress) {
  return progress < 0.24 ? easeOutCubic(progress / 0.24) : 1;
}

function bubbleCover({ opacity, scale = 1, dx = 0, dy = 0 }) {
  return `
    <g opacity="${opacity}" transform="translate(${dx} ${dy}) translate(118 106) scale(${scale}) translate(-118 -106)">
      <rect x="36" y="52" width="164" height="104" rx="52" fill="#ffffff" />
    </g>
  `;
}

const effectSpecs = [
  {
    fileName: "en_sleep.webp",
    baseFile: "en_omit.webp",
    previewPage: 15,
    overlay(frameIndex, pageCount) {
      const progress = pageCount <= 1 ? 1 : frameIndex / (pageCount - 1);
      const settle = bubbleSettle(progress);
      const opacity = clamp(settle * fadeOutTail(progress, 0.9), 0, 1);
      const scale = 0.88 + settle * 0.12;
      const lift = 10 * (1 - settle);
      const drift = Math.sin(progress * Math.PI * 2) * 2;
      return `
        <g transform="translate(0 ${frameIndex * 250})">
          ${bubbleCover({ opacity: opacity * 0.98, scale, dy: lift })}
          <g opacity="${opacity}" transform="translate(${drift} ${lift}) translate(118 104) scale(${scale}) translate(-118 -104)" fill="#7363d6" stroke="#ffffff" stroke-width="6" ${paintOrder}>
            <text x="78" y="109" font-size="40" font-family="Segoe UI, Arial, sans-serif" font-weight="800" transform="rotate(-10 78 109)">Z</text>
            <text x="114" y="96" font-size="30" font-family="Segoe UI, Arial, sans-serif" font-weight="800" transform="rotate(-5 114 96)">z</text>
            <text x="141" y="84" font-size="22" font-family="Segoe UI, Arial, sans-serif" font-weight="800" transform="rotate(-1 141 84)">z</text>
          </g>
        </g>
      `;
    },
  },
  {
    fileName: "en_cry.webp",
    baseFile: "en_omit.webp",
    previewPage: 15,
    overlay(frameIndex, pageCount) {
      const progress = pageCount <= 1 ? 1 : frameIndex / (pageCount - 1);
      const settle = bubbleSettle(progress);
      const opacity = clamp(settle * fadeOutTail(progress, 0.88), 0, 1);
      const scale = 0.9 + settle * 0.1;
      const bob = Math.sin(progress * Math.PI * 3) * 2;
      const dropOffset = Math.sin(progress * Math.PI * 4) * 3;
      return `
        <g transform="translate(0 ${frameIndex * 250})">
          ${bubbleCover({ opacity: opacity * 0.98, scale, dy: 8 * (1 - settle) })}
          <g opacity="${opacity}" transform="translate(0 ${bob}) translate(118 106) scale(${scale}) translate(-118 -106)">
            <path d="M92 76 C80 96 76 106 76 117 C76 135 90 149 108 149 C126 149 140 135 140 117 C140 106 136 96 124 76 Z" fill="#7ecfff" stroke="#ffffff" stroke-width="6" ${paintOrder}/>
            <path d="M134 95 C128 106 126 112 126 119 C126 130 134 138 145 138 C156 138 164 130 164 119 C164 112 162 106 156 95 Z" fill="#4fb6ff" stroke="#ffffff" stroke-width="5" ${paintOrder} transform="translate(0 ${dropOffset})"/>
            <ellipse cx="102" cy="104" rx="10" ry="18" fill="#ffffff" opacity="0.32"/>
            <ellipse cx="142" cy="116" rx="7" ry="12" fill="#ffffff" opacity="0.28"/>
          </g>
        </g>
      `;
    },
  },
  {
    fileName: "en_dizzy.webp",
    baseFile: "en_omit.webp",
    previewPage: 15,
    overlay(frameIndex, pageCount) {
      const progress = pageCount <= 1 ? 1 : frameIndex / (pageCount - 1);
      const settle = bubbleSettle(progress);
      const opacity = clamp(settle * fadeOutTail(progress, 0.9), 0, 1);
      const scale = 0.9 + settle * 0.1;
      const rotation = -18 + progress * 36;
      const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.03;
      const starDrift = Math.sin(progress * Math.PI * 2) * 3;
      return `
        <g transform="translate(0 ${frameIndex * 250})">
          ${bubbleCover({ opacity: opacity * 0.98, scale: scale * pulse, dy: 9 * (1 - settle) })}
          <g opacity="${opacity}" transform="translate(118 106) rotate(${rotation}) scale(${scale * pulse}) translate(-118 -106)">
            <path d="M98 80 C121 55 163 69 166 102 C169 132 133 148 109 133 C89 121 90 90 115 83 C131 78 148 89 148 104 C148 117 136 125 125 122 C115 119 111 109 116 102" fill="none" stroke="#7861d8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M165 74 L170 86 L183 88 L173 97 L176 111 L165 104 L153 111 L156 97 L146 88 L159 86 Z" fill="#ffd978" stroke="#ffffff" stroke-width="4" ${paintOrder} transform="translate(${starDrift} ${-starDrift})"/>
            <path d="M82 132 L86 142 L96 145 L88 152 L90 162 L82 157 L74 162 L76 152 L68 145 L78 142 Z" fill="#9fe6ff" stroke="#ffffff" stroke-width="4" ${paintOrder} transform="translate(${-starDrift} ${starDrift})"/>
          </g>
        </g>
      `;
    },
  },
  {
    fileName: "en_heartbreak.webp",
    baseFile: "en_suki.webp",
    previewPage: 18,
    overlay(frameIndex, pageCount) {
      const progress = pageCount <= 1 ? 1 : frameIndex / (pageCount - 1);
      const settle = bubbleSettle(progress);
      const opacity = clamp(settle * fadeOutTail(progress, 0.92), 0, 1);
      const scale = 0.92 + settle * 0.08;
      const jitter = Math.sin(progress * Math.PI * 5) * 1.6;
      return `
        <g transform="translate(0 ${frameIndex * 250})">
          <g opacity="${opacity}" transform="translate(118 107) scale(${scale}) translate(-118 -107)">
            <path d="M123 66 L108 100 L122 100 L111 127 L134 98 L120 98 Z" fill="#ffffff" stroke="#b94159" stroke-width="4" ${paintOrder} transform="translate(${jitter} 0)"/>
            <path d="M101 120 L95 136 L106 129 Z" fill="#ffffff" stroke="#b94159" stroke-width="3" ${paintOrder} transform="translate(${-jitter} ${jitter})"/>
            <path d="M138 84 L145 100 L155 90 Z" fill="#ffffff" stroke="#b94159" stroke-width="3" ${paintOrder} transform="translate(${jitter} ${-jitter})"/>
          </g>
        </g>
      `;
    },
  },
];

function buildOverlaySvg(frameSize, pageCount, overlay) {
  const totalHeight = frameSize * pageCount;
  const groups = [];
  for (let frameIndex = 0; frameIndex < pageCount; frameIndex += 1) {
    groups.push(overlay(frameIndex, pageCount));
  }
  return Buffer.from(
    `<svg width="${frameSize}" height="${totalHeight}" viewBox="0 0 ${frameSize} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">${groups.join("")}</svg>`,
  );
}

async function deriveAnimatedEffect(spec) {
  const inputPath = path.join(publicEffectsDir, spec.baseFile);
  const inputMeta = await sharp(inputPath, { animated: true }).metadata();
  const pageCount = inputMeta.pages ?? 1;
  const frameSize = inputMeta.pageHeight ?? inputMeta.height ?? 250;
  const overlay = buildOverlaySvg(frameSize, pageCount, spec.overlay);
  const outputBuffer = await sharp(inputPath, { animated: true })
    .composite([{ input: overlay }])
    .webp({
      quality: 95,
      effort: 6,
      loop: inputMeta.loop ?? 0,
      delay: inputMeta.delay,
    })
    .toBuffer();
  return {
    outputBuffer,
    pageCount,
    previewPage: Math.min(spec.previewPage ?? 0, Math.max(pageCount - 1, 0)),
  };
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeOutputs(spec, outputBuffer) {
  const publicPath = path.join(publicEffectsDir, spec.fileName);
  const templatePath = path.join(templateEffectsDir, spec.fileName);
  await ensureDir(path.dirname(publicPath));
  await ensureDir(path.dirname(templatePath));
  await Promise.all([
    fs.writeFile(publicPath, outputBuffer),
    fs.writeFile(templatePath, outputBuffer),
  ]);
  return { publicPath, templatePath };
}

async function writePreview(spec, page) {
  await ensureDir(previewDir);
  const publicPath = path.join(publicEffectsDir, spec.fileName);
  const previewPath = path.join(previewDir, spec.fileName.replace(/\.webp$/i, `.page-${page}.png`));
  await sharp(publicPath, { page }).png().toFile(previewPath);
  return previewPath;
}

async function main() {
  const results = [];
  for (const spec of effectSpecs) {
    const { outputBuffer, pageCount, previewPage } = await deriveAnimatedEffect(spec);
    const paths = await writeOutputs(spec, outputBuffer);
    const previewPath = await writePreview(spec, previewPage);
    results.push({
      fileName: spec.fileName,
      pageCount,
      previewPage,
      ...paths,
      previewPath,
    });
  }
  console.table(results);
}

try {
  await main();
}
catch (error) {
  console.error(error);
  process.exitCode = 1;
}
