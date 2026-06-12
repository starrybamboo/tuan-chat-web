#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_ROOT = "D:\\gululu-cache\\output\\opus-88-owner-only-refetch-v3";

function parseArgs(argv) {
  const args = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, "true");
      continue;
    }
    args.set(key, next);
    index += 1;
  }
  const root = args.get("root") ?? DEFAULT_ROOT;
  return {
    root,
    cleanDir:
      args.get("clean-dir") ??
      path.join(root, "image-role-review-clean-human-full"),
    manifest:
      args.get("manifest") ??
      path.join(root, "image-role-review-copy", "manifest.json"),
    outDir:
      args.get("out-dir") ??
      path.join(root, "image-role-review-clean-human-full", "reports", "role-visual-audit"),
  };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

function normalizeRel(rel) {
  return String(rel ?? "").replaceAll("\\", "/");
}

function sanitizeSegment(value) {
  return String(value || "unknown")
    .replace(/[\p{Cc}<>:"/\\|?*]/gu, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

async function readExistingCorrections(outDir) {
  const file = path.join(outDir, "visual-corrections.csv");
  if (!(await fileExists(file))) return new Map();
  const rows = parseCsv(await fs.readFile(file, "utf8"));
  return new Map(rows.map((row) => [normalizeRel(row.sourceRelPath), row]));
}

function contextText(entry) {
  return (entry.contexts ?? [])
    .slice(0, 3)
    .map((context) => {
      const before = context.before ? `before=${context.before}` : "";
      const after = context.after ? `after=${context.after}` : "";
      return `floor=${context.floor}; speakerBefore=${context.speakerBefore ?? ""}; speakerAfter=${context.speakerAfter ?? ""}; ${before}; ${after}`;
    })
    .join(" / ")
    .slice(0, 1000);
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function resetDir(dir) {
  const resolved = path.resolve(dir);
  if (resolved.length < 10) throw new Error(`Refusing to remove short path: ${resolved}`);
  await fs.rm(resolved, { recursive: true, force: true });
  await fs.mkdir(resolved, { recursive: true });
}

async function makeTile(imageFile, label, tileW, tileH, labelH) {
  const image = await sharp(imageFile, { failOn: "none" })
    .resize(tileW, tileH - labelH, { fit: "inside", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .extend({ top: 0, bottom: labelH, left: 0, right: 0, background: "#ffffff" })
    .png()
    .toBuffer();
  const safe = escapeXml(label);
  const svg = Buffer.from(
    `<svg width="${tileW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="100%" height="100%" fill="#ffffff"/>` +
      `<text x="5" y="15" font-size="10" font-family="Arial, sans-serif" fill="#111">${safe.slice(0, 34)}</text>` +
      `<text x="5" y="30" font-size="10" font-family="Arial, sans-serif" fill="#111">${safe.slice(34, 68)}</text>` +
      `<text x="5" y="45" font-size="10" font-family="Arial, sans-serif" fill="#111">${safe.slice(68, 102)}</text>` +
      `</svg>`,
  );
  return { image, svg };
}

async function writeCharacterSheet(character, rows, outDir) {
  const tileW = 180;
  const tileH = 238;
  const labelH = 54;
  const cols = 5;
  const composites = [];
  const ordered = [...rows].sort((a, b) => a.outputRelPath.localeCompare(b.outputRelPath));
  for (let index = 0; index < ordered.length; index += 1) {
    const row = ordered[index];
    const label = `${String(index + 1).padStart(3, "0")} ${row.sourceRelPath}`;
    const { image, svg } = await makeTile(row.outputAbsPath, label, tileW, tileH, labelH);
    const left = (index % cols) * tileW;
    const top = Math.floor(index / cols) * tileH;
    composites.push({ input: image, left, top });
    composites.push({ input: svg, left, top: top + tileH - labelH });
  }
  const sheetRows = Math.max(1, Math.ceil(ordered.length / cols));
  const file = path.join(outDir, "contact-sheets", `${sanitizeSegment(character)}.png`);
  await sharp({
    create: {
      width: cols * tileW,
      height: sheetRows * tileH,
      channels: 3,
      background: "#eef0f3",
    },
  })
    .composite(composites)
    .png()
    .toFile(file);
  return file;
}

async function main() {
  const options = parseArgs(process.argv);
  const manifest = await readJson(options.manifest);
  const existingCorrections = await readExistingCorrections(options.outDir);
  const manifestBySource = new Map(
    (manifest.entries ?? []).map((entry) => [normalizeRel(entry.sourceRelPath), entry]),
  );
  const indexCsv = await fs.readFile(path.join(options.cleanDir, "index.csv"), "utf8");
  const lines = indexCsv.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  const rows = lines.slice(1).map((line) => {
    const values = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
        continue;
      }
      if (char === "," && !quoted) {
        values.push(cell);
        cell = "";
        continue;
      }
      cell += char;
    }
    values.push(cell);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });

  await resetDir(options.outDir);
  await fs.mkdir(path.join(options.outDir, "contact-sheets"), { recursive: true });

  const reviewRows = [];
  for (const row of rows) {
    const outputAbsPath = path.join(options.cleanDir, row.outputRelPath.replaceAll("/", path.sep));
    if (!(await fileExists(outputAbsPath))) continue;
    const entry = manifestBySource.get(normalizeRel(row.sourceRelPath));
    reviewRows.push({
      character: row.character,
      sourceRelPath: normalizeRel(row.sourceRelPath),
      sha256: row.sha256,
      outputRelPath: normalizeRel(row.outputRelPath),
      outputAbsPath,
      currentCharacter: row.character,
      visualStatus: existingCorrections.get(normalizeRel(row.sourceRelPath))?.visualStatus ?? "",
      visualCharacter: existingCorrections.get(normalizeRel(row.sourceRelPath))?.visualCharacter ?? "",
      assetKind: existingCorrections.get(normalizeRel(row.sourceRelPath))?.assetKind ?? entry?.assetKind ?? "",
      exclude: existingCorrections.get(normalizeRel(row.sourceRelPath))?.exclude ?? "",
      confidence: existingCorrections.get(normalizeRel(row.sourceRelPath))?.confidence ?? "",
      notes: existingCorrections.get(normalizeRel(row.sourceRelPath))?.notes ?? "",
      context: contextText(entry ?? {}),
    });
  }

  const byCharacter = new Map();
  for (const row of reviewRows) {
    if (!byCharacter.has(row.character)) byCharacter.set(row.character, []);
    byCharacter.get(row.character).push(row);
  }

  const sheetRows = [];
  for (const [character, characterRows] of [...byCharacter.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sheet = await writeCharacterSheet(character, characterRows, options.outDir);
    const rel = normalizeRel(path.relative(options.outDir, sheet));
    sheetRows.push({
      character,
      imageCount: characterRows.length,
      sheetRelPath: rel,
    });
    for (const row of characterRows) row.sheetRelPath = rel;
  }

  const correctionColumns = [
    "sourceRelPath",
    "sha256",
    "currentCharacter",
    "visualStatus",
    "visualCharacter",
    "assetKind",
    "exclude",
    "confidence",
    "notes",
  ];
  const reviewColumns = [
    ...correctionColumns,
    "outputRelPath",
    "sheetRelPath",
    "context",
  ];
  await fs.writeFile(
    path.join(options.outDir, "visual-corrections.csv"),
    `${toCsv(reviewRows, correctionColumns)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(options.outDir, "visual-review-input.csv"),
    `${toCsv(reviewRows, reviewColumns)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(options.outDir, "contact-sheets.csv"),
    `${toCsv(sheetRows, ["character", "imageCount", "sheetRelPath"])}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(options.outDir, "README.md"),
    [
      "# 角色视觉复核包",
      "",
      "这里是最终角色归属的视觉审查入口。",
      "",
      "- `contact-sheets/`: 按当前角色目录生成的整页图板。",
      "- `visual-review-input.csv`: 图像、上下文、当前角色和图板位置。",
      "- `visual-corrections.csv`: 视觉模型或人工写回的结构化修正。",
      "",
      "字段约定：",
      "",
      "- `visualStatus=confirmed` 且 `visualCharacter` 非空：确认或改正角色。",
      "- `exclude=true`：不进入最终角色头像目录。",
      "- `assetKind`：可写 `avatar`、`avatar-framed`、`manga-avatar`、`reference-only` 等。",
      "",
      "严格最终输出必须把本 CSV 传给 `gululu-build-clean-human-images.mjs --visual-corrections ... --require-visual-confirmation`。",
      "",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(options.outDir, "summary.json"),
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      cleanDir: options.cleanDir,
      imageCount: reviewRows.length,
      characterCount: sheetRows.length,
      correctionsCsv: "visual-corrections.csv",
      reviewInputCsv: "visual-review-input.csv",
      contactSheetsCsv: "contact-sheets.csv",
    }, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify({
    outDir: options.outDir,
    imageCount: reviewRows.length,
    characterCount: sheetRows.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
