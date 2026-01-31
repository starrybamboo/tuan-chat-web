import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import fg from "fast-glob";
import sharp from "sharp";

const root = process.cwd();
const stylesDir = path.resolve(root, "app/assets/ai-image/styles");
const maxWidth = Number(process.env.AI_STYLE_MAX_WIDTH ?? "256");
const quality = Number(process.env.AI_STYLE_QUALITY ?? "75");

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  }
  catch {
    return false;
  }
}

if (!(await pathExists(stylesDir))) {
  process.exit(0);
}

const files = await fg(["**/*.{png,jpg,jpeg,webp}"], {
  cwd: stylesDir,
  absolute: true,
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function retryFsOp(fn, attempts = 3, delayMs = 150) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    }
    catch (err) {
      lastErr = err;
      if (err?.code !== "EBUSY" && err?.code !== "EPERM")
        throw err;
      if (i < attempts - 1)
        await wait(delayMs);
    }
  }
  throw lastErr;
}

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const dir = path.dirname(file);
  const base = path.basename(file, ext);
  if (!base)
    continue;

  const output = path.join(dir, `${base}.webp`);
  const tempOutput = `${output}.tmp`;

  await sharp(file)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(tempOutput);

  try {
    await retryFsOp(() => fs.rm(output, { force: true }));
    await retryFsOp(() => fs.rename(tempOutput, output));
    if (file !== output)
      await retryFsOp(() => fs.rm(file, { force: true }));
  }
  catch (err) {
    // best-effort cleanup and continue; log for visibility
    console.warn(`Skip optimizing ${file}: ${err?.code ?? err}`);
    await fs.rm(tempOutput, { force: true }).catch(() => {});
  }
}
