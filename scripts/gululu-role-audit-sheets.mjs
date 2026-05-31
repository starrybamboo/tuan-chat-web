import { Buffer } from "node:buffer";
import { mkdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const DEFAULT_ROOT = "D:/gululu-cache/output/opus-88-owner-only-refetch-v3";
const DEFAULT_REVIEW_URL = "http://127.0.0.1:48788/api/state";

function parseArgs(argv) {
  const args = {
    columns: 5,
    limitPerRole: 0,
    outDir: "",
    roles: [],
    root: DEFAULT_ROOT,
    status: "confirmed",
    tileHeight: 250,
    tileWidth: 220,
    url: DEFAULT_REVIEW_URL,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--root")
      args.root = argv[++index];
    else if (arg === "--url")
      args.url = argv[++index];
    else if (arg === "--out-dir")
      args.outDir = argv[++index];
    else if (arg === "--status")
      args.status = argv[++index];
    else if (arg === "--roles")
      args.roles = argv[++index].split(",").map(item => item.trim()).filter(Boolean);
    else if (arg === "--columns")
      args.columns = Number(argv[++index]);
    else if (arg === "--limit-per-role")
      args.limitPerRole = Number(argv[++index]);
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

function replaceInvalidPathChars(value) {
  return Array.from(value, char => ("<>:\"/\\|?*".includes(char) || char.charCodeAt(0) <= 0x1F) ? "_" : char).join("");
}

function safeSegment(value) {
  return replaceInvalidPathChars(String(value || "未命名"))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => body += chunk);
      response.on("end", () => {
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error(`HTTP ${response.statusCode}: ${body}`));
          return;
        }
        resolve(JSON.parse(body));
      });
    }).on("error", reject);
  });
}

function roleName(entry) {
  return entry.correction?.confirmedCharacter || entry.candidateCharacter || entry.bucket || "未命名";
}

function labelSvg({ entry, index, role, width }) {
  const duplicate = entry.duplicateCount > 1 ? ` x${entry.duplicateCount}` : "";
  const title = `${index}. ${role}${duplicate}`;
  const sub = `F${entry.firstFloor ?? "-"} ${entry.sourceRelPath}`;
  return Buffer.from(`
    <svg width="${width}" height="54" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="8" y="20" font-size="15" font-family="Microsoft YaHei, Arial" font-weight="700" fill="#111">${escapeXml(title)}</text>
      <text x="8" y="42" font-size="11" font-family="Consolas, Microsoft YaHei, Arial" fill="#555">${escapeXml(sub.slice(0, 38))}</text>
    </svg>
  `);
}

async function makeTile({ entry, index, reviewDir, role, tileHeight, tileWidth }) {
  const imagePath = path.join(reviewDir, entry.outputRelPath);
  const labelHeight = 54;
  const imageHeight = tileHeight - labelHeight;
  let image;
  try {
    image = await sharp(imagePath)
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
  }
  catch {
    image = await sharp({
      create: {
        background: "#ffffff",
        channels: 4,
        height: imageHeight,
        width: tileWidth,
      },
    })
      .composite([{
        input: Buffer.from(`
          <svg width="${tileWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#fff7f7"/>
            <text x="12" y="42" font-size="16" font-family="Microsoft YaHei, Arial" fill="#991b1b">图片无法解析</text>
          </svg>
        `),
        left: 0,
        top: 0,
      }])
      .png()
      .toBuffer();
  }
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
      { input: labelSvg({ entry, index, role, width: tileWidth }), left: 0, top: imageHeight },
    ])
    .png()
    .toBuffer();
}

async function writeRoleSheets({ args, entries, outDir, reviewDir, role }) {
  const selected = entries
    .filter(entry => roleName(entry) === role && entry.effectiveStatus === args.status)
    .sort((left, right) => {
      return (Number(left.firstFloor) || 0) - (Number(right.firstFloor) || 0)
        || String(left.sourceRelPath).localeCompare(String(right.sourceRelPath));
    });
  const limited = args.limitPerRole > 0 ? selected.slice(0, args.limitPerRole) : selected;
  const rows = Math.ceil(25 / args.columns);
  const batchSize = args.columns * rows;
  const sheets = [];
  const mappings = [];

  for (let offset = 0; offset < limited.length; offset += batchSize) {
    const batch = limited.slice(offset, offset + batchSize);
    const tileBuffers = [];
    for (const [batchIndex, entry] of batch.entries()) {
      tileBuffers.push(await makeTile({
        entry,
        index: offset + batchIndex + 1,
        reviewDir,
        role,
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
    const sheetName = `${safeSegment(role)}-batch-${String(sheets.length + 1).padStart(3, "0")}.png`;
    await sharp({
      create: {
        background: "#d8ddd0",
        channels: 4,
        height,
        width,
      },
    }).composite(composite).png().toFile(path.join(outDir, sheetName));
    const mappingName = `${safeSegment(role)}-batch-${String(sheets.length + 1).padStart(3, "0")}.json`;
    await writeFile(path.join(outDir, mappingName), `${JSON.stringify(batch.map((entry, index) => ({
      confirmedCharacter: roleName(entry),
      duplicateCount: entry.duplicateCount,
      id: offset + index + 1,
      outputRelPath: entry.outputRelPath,
      sha256: entry.sha256,
      sourceRelPath: entry.sourceRelPath,
      sourceRelPaths: entry.sourceRelPaths,
    })), null, 2)}\n`, "utf8");
    sheets.push(sheetName);
    mappings.push(mappingName);
  }

  return { count: selected.length, mappings, role, sheets };
}

function writeIndexHtml({ outDir, results, status }) {
  const totalEntries = results.reduce((sum, result) => sum + result.count, 0);
  const totalSheets = results.reduce((sum, result) => sum + result.sheets.length, 0);
  const resultBlocks = results.map((result) => {
    const links = result.sheets.map((sheetName, index) => {
      const mappingName = result.mappings[index];
      return `
        <figure class="sheet">
          <a href="${escapeXml(sheetName)}"><img src="${escapeXml(sheetName)}" loading="lazy" alt="${escapeXml(result.role)} ${index + 1}"></a>
          <figcaption>
            <span>${escapeXml(sheetName)}</span>
            <a href="${escapeXml(mappingName)}">mapping</a>
          </figcaption>
        </figure>`;
    }).join("");
    return `
      <section class="role">
        <h2>${escapeXml(result.role)} <small>${result.count} entries / ${result.sheets.length} sheets</small></h2>
        <div class="sheets">${links}</div>
      </section>`;
  }).join("");
  return writeFile(path.join(outDir, "index.html"), `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gululu role audit - ${escapeXml(status)}</title>
  <style>
    :root { color-scheme: light; font-family: "Microsoft YaHei", Arial, sans-serif; }
    body { margin: 0; background: #f6f7f3; color: #182016; }
    header { position: sticky; top: 0; z-index: 1; padding: 16px 24px; background: rgba(246, 247, 243, .94); border-bottom: 1px solid #d9ded1; backdrop-filter: blur(8px); }
    h1 { margin: 0 0 6px; font-size: 22px; }
    p { margin: 0; color: #52604b; }
    main { padding: 20px 24px 40px; }
    .role { margin: 0 0 28px; }
    h2 { margin: 0 0 12px; font-size: 18px; }
    small { margin-left: 8px; color: #66715f; font-size: 13px; font-weight: 400; }
    .sheets { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; align-items: start; }
    .sheet { margin: 0; border: 1px solid #d9ded1; background: #fff; border-radius: 8px; overflow: hidden; }
    .sheet img { display: block; width: 100%; height: auto; background: #d8ddd0; }
    figcaption { display: flex; justify-content: space-between; gap: 12px; padding: 8px 10px; color: #52604b; font-size: 12px; }
    figcaption span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    a { color: #1d5f9f; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header>
    <h1>Gululu role audit - ${escapeXml(status)}</h1>
    <p>${results.length} roles, ${totalEntries} entries, ${totalSheets} sheets. Open each PNG for full-size review; mapping links point to source paths and hashes.</p>
  </header>
  <main>${resultBlocks}</main>
</body>
</html>
`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root);
  const reviewDir = path.join(root, "image-role-review-copy");
  const outDir = path.resolve(args.outDir || path.join(root, "vision-review-sheets", `role-audit-${args.status}`));
  await rm(outDir, { force: true, recursive: true });
  await mkdir(outDir, { recursive: true });

  const state = await fetchJson(args.url);
  const roleCounts = new Map();
  for (const entry of state.entries) {
    if (entry.effectiveStatus !== args.status)
      continue;
    const role = roleName(entry);
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }
  const roles = args.roles.length > 0
    ? args.roles
    : [...roleCounts.entries()].sort((left, right) => right[1] - left[1]).map(([role]) => role);

  const results = [];
  for (const role of roles) {
    if (!roleCounts.has(role))
      continue;
    results.push(await writeRoleSheets({
      args,
      entries: state.entries,
      outDir,
      reviewDir,
      role,
    }));
  }

  await writeFile(path.join(outDir, "index.json"), `${JSON.stringify({
    outDir,
    results,
    status: args.status,
    totalRoles: results.length,
  }, null, 2)}\n`, "utf8");
  await writeIndexHtml({ outDir, results, status: args.status });
  console.log(JSON.stringify({
    indexHtml: path.join(outDir, "index.html"),
    outDir,
    roles: results.slice(0, 20).map(result => ({ count: result.count, role: result.role, sheets: result.sheets.length })),
    totalRoles: results.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
