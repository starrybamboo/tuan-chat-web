import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import fg from "fast-glob";
import sharp from "sharp";

const root = process.cwd();
const stylesDir = path.resolve(root, "app/assets/ai-image/styles");
const maxWidth = Number(process.env.AI_STYLE_MAX_WIDTH ?? "256");
const quality = Number(process.env.AI_STYLE_QUALITY ?? "75");
const retryableErrorCodes = new Set(["EBUSY", "EPERM", "EACCES"]);
const retryDelayMs = [100, 200, 400, 800, 1200];

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  }
  catch {
    return false;
  }
}

async function withRetry(op, label) {
  let lastError;
  for (let i = 0; i < retryDelayMs.length; i += 1) {
    try {
      return await op();
    }
    catch (error) {
      const code = error?.code;
      lastError = error;
      if (!retryableErrorCodes.has(code)) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelayMs[i]));
    }
  }
  if (label) {
    console.warn(`[optimize-ai-style-images] ${label} failed after retries`, lastError);
  }
  throw lastError;
}

if (!(await pathExists(stylesDir))) {
  process.exit(0);
}

const files = await fg(["**/*.{png,jpg,jpeg,webp}"], {
  cwd: stylesDir,
  absolute: true,
});

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const dir = path.dirname(file);
  const base = path.basename(file, ext);
  if (!base)
    continue;

  const output = path.join(dir, `${base}.webp`);
  const tempOutput = `${output}.tmp`;
  try {
    await sharp(file)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toFile(tempOutput);

    await withRetry(() => fs.rm(output, { force: true }), "remove output");
    await withRetry(() => fs.rename(tempOutput, output), "rename temp output");

    if (file !== output) {
      await withRetry(() => fs.rm(file, { force: true }), "remove source");
    }
  }
  catch (error) {
    console.warn(`[optimize-ai-style-images] skip ${file}`, error);
    try {
      await fs.rm(tempOutput, { force: true });
    }
    catch {
      // ignore cleanup errors
    }
  }
}
