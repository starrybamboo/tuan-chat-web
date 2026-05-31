import { Buffer } from "node:buffer";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const DEFAULT_ROOT = "D:/gululu-cache/output/opus-88-owner-only-refetch-v3";
const DEFAULT_OUT_DIR = "vision-review-sheets";
const DEFAULT_STATUS = "unknown";

function parseArgs(argv) {
  const args = {
    columns: 5,
    limit: 0,
    outDir: "",
    root: DEFAULT_ROOT,
    status: DEFAULT_STATUS,
    tileHeight: 250,
    tileWidth: 220,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--root")
      args.root = argv[++index];
    else if (arg === "--status")
      args.status = argv[++index];
    else if (arg === "--out-dir")
      args.outDir = argv[++index];
    else if (arg === "--columns")
      args.columns = Number(argv[++index]);
    else if (arg === "--limit")
      args.limit = Number(argv[++index]);
    else throw new Error(`未知参数: ${arg}`);
  }
  return args;
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function labelSvg({ entry, index, width }) {
  const title = `${index}. ${entry.candidateCharacter || entry.bucket || "未识别"}`;
  const sub = `F${entry.contexts?.[0]?.floor ?? "-"} ${entry.sourceRelPath}`;
  return Buffer.from(`
    <svg width="${width}" height="54" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="8" y="20" font-size="15" font-family="Microsoft YaHei, Arial" font-weight="700" fill="#111">${escapeXml(title)}</text>
      <text x="8" y="42" font-size="11" font-family="Consolas, Microsoft YaHei, Arial" fill="#555">${escapeXml(sub.slice(0, 36))}</text>
    </svg>
  `);
}

async function makeTile({ entry, index, reviewDir, tileHeight, tileWidth }) {
  const imagePath = path.join(reviewDir, entry.outputRelPath);
  const labelHeight = 54;
  const imageHeight = tileHeight - labelHeight;
  const image = await sharp(imagePath)
    .resize({
      background: "#ffffff",
      fit: "contain",
      height: imageHeight,
      width: tileWidth,
    })
    .extend({
      background: "#ffffff",
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    })
    .png()
    .toBuffer();
  return sharp({
    create: {
      background: "#f7f8f4",
      channels: 4,
      height: tileHeight,
      width: tileWidth,
    },
  })
    .composite([
      { input: image, left: 0, top: 0 },
      { input: labelSvg({ entry, index, width: tileWidth }), left: 0, top: imageHeight },
    ])
    .png()
    .toBuffer();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root);
  const reviewDir = path.join(root, "image-role-review-copy");
  const outDir = path.resolve(args.outDir || path.join(root, DEFAULT_OUT_DIR, args.status));
  await rm(outDir, { force: true, recursive: true });
  await mkdir(outDir, { recursive: true });

  const manifest = JSON.parse(await readFile(path.join(reviewDir, "manifest.json"), "utf8"));
  let entries = manifest.entries.filter(entry => entry.reviewStatus === args.status || entry.bucket === args.status);
  entries = entries.sort((left, right) => {
    const leftFloor = left.contexts?.[0]?.floor ?? 0;
    const rightFloor = right.contexts?.[0]?.floor ?? 0;
    return leftFloor - rightFloor || left.sourceRelPath.localeCompare(right.sourceRelPath);
  });
  if (args.limit > 0)
    entries = entries.slice(0, args.limit);

  const rows = Math.ceil(25 / args.columns);
  const batchSize = args.columns * rows;
  const sheets = [];
  for (let offset = 0; offset < entries.length; offset += batchSize) {
    const batch = entries.slice(offset, offset + batchSize);
    const tileBuffers = [];
    for (const [batchIndex, entry] of batch.entries()) {
      tileBuffers.push(await makeTile({
        entry,
        index: offset + batchIndex + 1,
        reviewDir,
        tileHeight: args.tileHeight,
        tileWidth: args.tileWidth,
      }));
    }
    const sheetRows = Math.ceil(batch.length / args.columns);
    const width = args.columns * args.tileWidth;
    const height = sheetRows * args.tileHeight;
    const composite = tileBuffers.map((input, index) => ({
      input,
      left: (index % args.columns) * args.tileWidth,
      top: Math.floor(index / args.columns) * args.tileHeight,
    }));
    const sheetName = `${args.status}-batch-${String(sheets.length + 1).padStart(4, "0")}.png`;
    await sharp({
      create: {
        background: "#d8ddd0",
        channels: 4,
        height,
        width,
      },
    }).composite(composite).png().toFile(path.join(outDir, sheetName));
    const mappingName = `${args.status}-batch-${String(sheets.length + 1).padStart(4, "0")}.json`;
    await writeFile(path.join(outDir, mappingName), `${JSON.stringify(batch.map((entry, index) => ({
      candidateCharacter: entry.candidateCharacter,
      contexts: entry.contexts,
      id: offset + index + 1,
      outputRelPath: entry.outputRelPath,
      sha256: entry.sha256,
      sourceRelPath: entry.sourceRelPath,
    })), null, 2)}\n`, "utf8");
    sheets.push(sheetName);
  }

  await writeFile(path.join(outDir, "index.json"), `${JSON.stringify({ count: entries.length, outDir, sheets }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ count: entries.length, outDir, sheets: sheets.slice(0, 5), totalSheets: sheets.length }, null, 2));
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
