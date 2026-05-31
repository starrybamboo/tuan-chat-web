import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_BOOK_ID = 88;
const DEFAULT_BACKEND = "https://backend.gululu.world";
const DEFAULT_WEB = "https://www.gululu.world";
const DEFAULT_OUTPUT_ROOT = "D:/gululu-cache/output";
const DEFAULT_CHUNK_SIZE = 100;
const DEFAULT_PART_SIZE = 50;
const IMAGE_EXT_BY_TYPE = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/bmp", ".bmp"],
]);

function timestampSegment(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function normalizeSlashes(value) {
  return String(value).replace(/\\/g, "/");
}

function replaceInvalidPathChars(value) {
  return Array.from(value, char => ("<>:\"/\\|?*".includes(char) || char.charCodeAt(0) <= 0x1F) ? "_" : char).join("");
}

function safeSegment(value) {
  return replaceInvalidPathChars(String(value || "unnamed"))
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 96) || "unnamed";
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function parseArgs(argv) {
  const args = {
    backend: DEFAULT_BACKEND,
    bookId: DEFAULT_BOOK_ID,
    chunkSize: DEFAULT_CHUNK_SIZE,
    outDir: "",
    outputRoot: DEFAULT_OUTPUT_ROOT,
    downloadConcurrency: 12,
    overwrite: false,
    ownerAuthorId: 0,
    partSize: DEFAULT_PART_SIZE,
    resume: false,
    skipImages: false,
    web: DEFAULT_WEB,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--backend") {
      args.backend = argv[++index];
    }
    else if (arg === "--book-id") {
      args.bookId = Number(argv[++index]);
    }
    else if (arg === "--chunk-size") {
      args.chunkSize = Number(argv[++index]);
    }
    else if (arg === "--out-dir") {
      args.outDir = argv[++index];
    }
    else if (arg === "--output-root") {
      args.outputRoot = argv[++index];
    }
    else if (arg === "--download-concurrency") {
      args.downloadConcurrency = Number(argv[++index]);
    }
    else if (arg === "--overwrite") {
      args.overwrite = true;
    }
    else if (arg === "--owner-author-id") {
      args.ownerAuthorId = Number(argv[++index]);
    }
    else if (arg === "--part-size") {
      args.partSize = Number(argv[++index]);
    }
    else if (arg === "--resume") {
      args.resume = true;
    }
    else if (arg === "--skip-images") {
      args.skipImages = true;
    }
    else if (arg === "--web") {
      args.web = argv[++index];
    }
    else {
      throw new Error(`未知参数: ${arg}`);
    }
  }
  return args;
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  }
  catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function prepareOutputDir(args) {
  const defaultName = `opus-${args.bookId}-owner-only-refetch-${timestampSegment()}`;
  const outDir = path.resolve(args.outDir || path.join(args.outputRoot, defaultName));
  if (await pathExists(outDir)) {
    if (args.resume) {
      return outDir;
    }
    if (!args.overwrite) {
      throw new Error(`输出目录已存在，请换目录或加 --overwrite: ${outDir}`);
    }
    const resolvedRoot = path.resolve(args.outputRoot);
    if (!outDir.startsWith(`${resolvedRoot}${path.sep}`)) {
      throw new Error(`拒绝覆盖 outputRoot 之外的目录: ${outDir}`);
    }
    await rm(outDir, { force: true, recursive: true });
  }
  await mkdir(outDir, { recursive: true });
  return outDir;
}

function defaultHeaders(extra = {}) {
  return {
    "Authorization": "Bearer ",
    "platform": "1",
    "user-agent": "Mozilla/5.0 gululu-refetch-opus/1.0",
    ...extra,
  };
}

async function fetchWithRetry(url, options = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status} ${response.statusText}: ${url}`);
    }
    catch (error) {
      lastError = error;
    }
    if (attempt < attempts) {
      await new Promise(resolve => setTimeout(resolve, 350 * attempt));
    }
  }
  throw lastError;
}

async function fetchJson(url, options = {}) {
  const response = await fetchWithRetry(url, options);
  return response.json();
}

async function fetchText(url, options = {}) {
  const response = await fetchWithRetry(url, options);
  return response.text();
}

function downloadWithCurl(url, targetPath) {
  const result = spawnSync("curl.exe", [
    "-L",
    "--fail",
    "--silent",
    "--show-error",
    "--connect-timeout",
    "8",
    "--max-time",
    "45",
    "--retry",
    "2",
    "--retry-delay",
    "1",
    "--output",
    targetPath,
    url,
  ], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`curl 下载失败: ${url}\n${result.stderr || result.stdout || ""}`.trim());
  }
}

function normalizeApiPayload(payload, label) {
  if (payload?.code && ![200, 201, 202, 203, 204, 404].includes(payload.code)) {
    throw new Error(`${label} 返回异常 code=${payload.code}: ${payload.msg ?? ""}`);
  }
  return payload?.data ?? payload;
}

async function fetchNextData(args, outDir) {
  const pageUrl = `${args.web}/book/${args.bookId}`;
  const html = await fetchText(pageUrl, { headers: defaultHeaders() });
  await writeFile(path.join(outDir, "raw", "page.html"), html, "utf8");

  const buildId = html.match(/"buildId"\s*:\s*"([^"]+)"/)?.[1]
    ?? html.match(/\/_next\/static\/([^/]+)\/_buildManifest\.js/)?.[1];
  if (!buildId) {
    return null;
  }

  const nextDataUrl = `${args.web}/_next/data/${buildId}/book/${args.bookId}.json?bookId=${args.bookId}`;
  const nextData = await fetchJson(nextDataUrl, { headers: defaultHeaders() });
  await writeFile(path.join(outDir, "raw", "next-data.json"), `${JSON.stringify(nextData, null, 2)}\n`, "utf8");
  return { buildId, nextDataUrl };
}

async function fetchBookDetail(args) {
  const detail = await fetchJson(`${args.backend}/reader/opus/detail/${args.bookId}`, {
    headers: defaultHeaders(),
  });
  return normalizeApiPayload(detail, "bookDetail");
}

async function fetchDirectory(args) {
  const directory = await fetchJson(`${args.backend}/reader/floor/index-list/${args.bookId}`, {
    headers: defaultHeaders(),
  });
  return normalizeApiPayload(directory, "bookDirectory");
}

async function fetchFloors(args, directory) {
  const floors = [];
  const chunks = chunkArray(directory.map(item => item.floorId), args.chunkSize);
  for (const [index, chunk] of chunks.entries()) {
    const payload = await fetchJson(`${args.backend}/reader/floor/content-by-ids`, {
      body: JSON.stringify(chunk),
      headers: defaultHeaders({ "content-type": "application/json" }),
      method: "POST",
    });
    const batch = normalizeApiPayload(payload, "bookFloors") ?? [];
    floors.push(...batch);
    console.log(`已拉取楼层批次 ${index + 1}/${chunks.length}，累计 ${floors.length}`);
  }
  return floors.sort((left, right) => left.floorNum - right.floorNum);
}

function renderInlineContent(content = []) {
  return content.map((node) => {
    if (node.type === "text") {
      return node.text ?? "";
    }
    if (node.type === "hardBreak") {
      return "\n";
    }
    if (Array.isArray(node.content)) {
      return renderInlineContent(node.content);
    }
    return "";
  }).join("");
}

function makeImageKey(url) {
  return createHash("sha1").update(url).digest("hex").slice(0, 12);
}

function imageExtensionFromUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if (ext && ext.length <= 8) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  }
  catch {
    return "";
  }
  return "";
}

function imageBaseName(node, url) {
  const attrs = node.attrs ?? {};
  const imageId = safeSegment(attrs.imageId || node.id || "image");
  return `${imageId}_${makeImageKey(url)}`;
}

function collectImageRefsFromNode(node, floor, result) {
  if (node.type === "image" && node.attrs?.src) {
    const url = node.attrs.src;
    const baseName = imageBaseName(node, url);
    const ext = imageExtensionFromUrl(url) || ".img";
    const relPath = normalizeSlashes(path.join("gululu", `${baseName}${ext}`));
    result.push({
      attrs: node.attrs ?? {},
      floorId: floor.id,
      floorNum: floor.floorNum,
      nodeId: node.id,
      relPath,
      url,
    });
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      collectImageRefsFromNode(child, floor, result);
    }
  }
}

function collectImageRefs(floors) {
  const refs = [];
  for (const floor of floors) {
    for (const node of floor.paragraphContents ?? []) {
      collectImageRefsFromNode(node, floor, refs);
    }
  }
  return refs;
}

function renderNode(node, floor, imageRelPathByNodeId) {
  if (node.type === "image" && node.attrs?.src) {
    const relPath = imageRelPathByNodeId.get(`${floor.id}:${node.id}`) ?? "";
    return relPath ? `![image](../images/${relPath})` : `![image](${node.attrs.src})`;
  }
  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 1);
    return `${"#".repeat(Math.min(Math.max(level, 1), 6))} ${renderInlineContent(node.content).trim()}`.trim();
  }
  if (node.type === "paragraph") {
    return renderInlineContent(node.content).trim();
  }
  if (node.type === "battleReplay") {
    return "[战斗重演]";
  }
  if (node.type === "jumpFloorComponent") {
    const attrs = node.attrs ?? {};
    return `[跳转楼层: ${attrs.description ?? attrs.floorNumber ?? ""}]`.trim();
  }
  if (node.type === "div" && Array.isArray(node.content)) {
    return node.content.map(child => renderNode(child, floor, imageRelPathByNodeId)).filter(Boolean).join("\n\n");
  }
  return renderInlineContent(node.content).trim();
}

function renderFloorMarkdown(floor, imageRelPathByNodeId) {
  const nodes = floor.paragraphContents ?? [];
  const rendered = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.type === "orderedParagraph") {
      const listLength = Number(node.attrs?.listLength ?? 0);
      const listItems = [];
      for (let offset = 0; offset < listLength; offset += 1) {
        const item = nodes[index + 1 + offset];
        if (!item) {
          break;
        }
        listItems.push(`${offset + 1}. ${renderNode(item, floor, imageRelPathByNodeId)}`);
      }
      rendered.push(listItems.join("\n"));
      index += listLength;
      continue;
    }
    rendered.push(renderNode(node, floor, imageRelPathByNodeId));
  }
  const body = rendered.filter(Boolean).join("\n\n");
  return [
    `## 第${floor.floorNum}楼`,
    `> 时间: ${floor.createTime}`,
    "",
    body,
    "",
  ].join("\n");
}

function makeImageRelPathByNodeId(imageRefs) {
  const map = new Map();
  const used = new Map();
  for (const ref of imageRefs) {
    let relPath = ref.relPath;
    const key = `${ref.floorId}:${ref.nodeId}`;
    const existingUrl = used.get(relPath);
    if (existingUrl && existingUrl !== ref.url) {
      const parsed = path.parse(relPath);
      relPath = normalizeSlashes(path.join(parsed.dir, `${parsed.name}_${makeImageKey(ref.url)}${parsed.ext}`));
    }
    used.set(relPath, ref.url);
    map.set(key, relPath);
    ref.relPath = relPath;
  }
  return map;
}

async function downloadImages(args, outDir, imageRefs, imageRelPathByNodeId) {
  const imagesDir = path.join(outDir, "images");
  await mkdir(imagesDir, { recursive: true });
  const byUrl = new Map();
  for (const ref of imageRefs) {
    if (!byUrl.has(ref.url)) {
      byUrl.set(ref.url, ref);
    }
  }

  const tasks = [...byUrl.values()];
  const downloaded = [];
  let completed = 0;
  let cursor = 0;

  const downloadOne = async (ref) => {
    const targetPath = path.join(imagesDir, ref.relPath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    let finalPath = targetPath;
    let finalRelPath = ref.relPath;
    let bytes;
    let contentType = "";
    if (args.resume && await pathExists(targetPath)) {
      bytes = await readFile(targetPath);
      downloaded.push({
        bytes: bytes.length,
        contentType,
        relPath: finalRelPath,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        url: ref.url,
      });
      return;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let response;
      try {
        response = await fetchWithRetry(ref.url, {
          headers: defaultHeaders(),
          signal: controller.signal,
        }, 1);
      }
      finally {
        clearTimeout(timeout);
      }
      bytes = Buffer.from(await response.arrayBuffer());
      contentType = response.headers.get("content-type") ?? "";
      const contentExt = IMAGE_EXT_BY_TYPE.get(contentType.split(";")[0]?.toLowerCase() ?? "");
      if (path.extname(targetPath) === ".img" && contentExt) {
        finalRelPath = normalizeSlashes(`${ref.relPath.slice(0, -4)}${contentExt}`);
        finalPath = path.join(imagesDir, finalRelPath);
      }
    }
    catch (error) {
      try {
        downloadWithCurl(ref.url, targetPath);
        bytes = await readFile(targetPath);
      }
      catch (curlError) {
        throw new Error([
          `图片下载失败: ${ref.url}`,
          `fetch: ${error?.message ?? error}`,
          `curl: ${curlError?.message ?? curlError}`,
        ].join("\n"));
      }
    }
    if (finalRelPath !== ref.relPath) {
      for (const imageRef of imageRefs.filter(item => item.url === ref.url)) {
        imageRef.relPath = finalRelPath;
        imageRelPathByNodeId.set(`${imageRef.floorId}:${imageRef.nodeId}`, finalRelPath);
      }
    }
    if (finalPath !== targetPath) {
      await writeFile(finalPath, bytes);
      if (finalPath !== targetPath) {
        await rm(targetPath, { force: true });
      }
    }
    else if (!await pathExists(finalPath)) {
      await writeFile(finalPath, bytes);
    }
    downloaded.push({
      bytes: bytes.length,
      contentType,
      relPath: finalRelPath,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      url: ref.url,
    });
  };

  const workerCount = Math.max(1, Math.min(Number(args.downloadConcurrency) || 12, tasks.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < tasks.length) {
      const ref = tasks[cursor];
      cursor += 1;
      await downloadOne(ref);
      completed += 1;
      if (completed === 1 || completed % 50 === 0 || completed === tasks.length) {
        console.log(`已下载图片 ${completed}/${tasks.length}`);
      }
    }
  });
  await Promise.all(workers);
  return downloaded;
}

async function writeParts(outDir, ownerFloors, imageRelPathByNodeId, partSize) {
  const partsDir = path.join(outDir, "parts");
  await mkdir(partsDir, { recursive: true });
  const parts = chunkArray(ownerFloors, partSize);
  const partFiles = [];
  for (const [index, floors] of parts.entries()) {
    const first = floors[0].floorNum;
    const last = floors.at(-1).floorNum;
    const fileName = `part-${String(index + 1).padStart(4, "0")}_floors-${first}-${last}.md`;
    const markdown = floors.map(floor => renderFloorMarkdown(floor, imageRelPathByNodeId)).join("\n");
    await writeFile(path.join(partsDir, fileName), markdown, "utf8");
    partFiles.push(fileName);
  }
  return partFiles;
}

function buildImageMap(imageRefs, downloadedImages) {
  const downloadByUrl = new Map(downloadedImages.map(item => [item.url, item]));
  return imageRefs.map((ref) => {
    const downloaded = downloadByUrl.get(ref.url);
    return {
      attrs: ref.attrs,
      bytes: downloaded?.bytes ?? 0,
      contentType: downloaded?.contentType ?? "",
      floorId: ref.floorId,
      floorNum: ref.floorNum,
      nodeId: ref.nodeId,
      relPath: ref.relPath,
      sha256: downloaded?.sha256 ?? "",
      url: ref.url,
    };
  });
}

async function writeIndex(outDir, meta, imageMap) {
  const summary = meta.summary;
  const lines = [
    "# 咕噜噜原帖重拉工作目录",
    "",
    `- 作品：${meta.title}`,
    `- bookId：${meta.opusId}`,
    `- 原作者：${meta.authorName} / authorId=${meta.ownerAuthorId}`,
    `- 生成时间：${meta.generatedAt}`,
    `- 原帖总楼层：${summary.totalFloors}`,
    `- 楼主正文楼层：${summary.ownerFloors}`,
    `- 楼主正文图片引用：${summary.ownerImageRefs}`,
    `- 去重下载图片：${summary.downloadedImages}`,
    "",
    "## 文件",
    "",
    "- `raw/next-data.json`：咕噜噜 Next 首屏数据。",
    "- `raw/floors-all.json`：从原帖接口重新拉取的全部楼层正文。",
    "- `raw/floors-owner.json`：过滤后的楼主正文楼层。",
    "- `parts/`：用于后续团剧 replay 导入的 markdown 分片。",
    "- `images/`：仅楼主正文引用到的图片。",
    "- `image-map.json`：图片 URL、本地路径、楼层、sha256 的映射。",
    "- `meta.json`：本次抓取元信息。",
    "",
    "## 图片审查入口",
    "",
    "下一步可运行 `gululu-image-review-pack.mjs`，从这些 `parts/` 与 `images/` 生成 `image-review-pack/by-character/`，用于人工核对头像角色。",
    "",
    "## 前 20 张图片",
    "",
    ...imageMap.slice(0, 20).map(item => `- 第${item.floorNum}楼：\`${item.relPath}\``),
    "",
  ];
  await writeFile(path.join(outDir, "index.md"), lines.join("\n"), "utf8");
}

async function refetchOpus(args) {
  const outDir = await prepareOutputDir(args);
  await mkdir(path.join(outDir, "raw"), { recursive: true });

  const nextDataInfo = await fetchNextData(args, outDir);
  const [bookDetail, directory] = await Promise.all([
    fetchBookDetail(args),
    fetchDirectory(args),
  ]);
  const ownerAuthorId = args.ownerAuthorId || bookDetail.authorId;
  const allFloors = await fetchFloors(args, directory);
  const ownerFloors = allFloors.filter(floor => floor.authorId === ownerAuthorId);

  const imageRefs = collectImageRefs(ownerFloors);
  const imageRelPathByNodeId = makeImageRelPathByNodeId(imageRefs);
  const downloadedImages = args.skipImages ? [] : await downloadImages(args, outDir, imageRefs, imageRelPathByNodeId);
  const partFiles = await writeParts(outDir, ownerFloors, imageRelPathByNodeId, args.partSize);
  const imageMap = buildImageMap(imageRefs, downloadedImages);

  const meta = {
    authorName: bookDetail.author?.nickName ?? "",
    backend: args.backend,
    generatedAt: new Date().toISOString(),
    nextData: nextDataInfo,
    opusId: args.bookId,
    ownerAuthorId,
    partCount: partFiles.length,
    partFiles,
    sourceUrl: `${args.web}/book/${args.bookId}`,
    summary: {
      directoryFloors: directory.length,
      downloadedImages: downloadedImages.length,
      ownerFloors: ownerFloors.length,
      ownerImageRefs: imageRefs.length,
      totalFloors: allFloors.length,
    },
    title: bookDetail.name,
    version: 1,
  };

  await writeFile(path.join(outDir, "raw", "book-detail.json"), `${JSON.stringify(bookDetail, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "raw", "directory.json"), `${JSON.stringify(directory, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "raw", "floors-all.json"), `${JSON.stringify(allFloors, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "raw", "floors-owner.json"), `${JSON.stringify(ownerFloors, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "downloaded-images.json"), `${JSON.stringify(downloadedImages, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "image-map.json"), `${JSON.stringify(imageMap, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  await writeIndex(outDir, meta, imageMap);

  return {
    outDir,
    summary: meta.summary,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await refetchOpus(args);
  console.log(JSON.stringify(result, null, 2));
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
