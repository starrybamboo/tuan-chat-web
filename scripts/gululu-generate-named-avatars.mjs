#!/usr/bin/env node

import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const DEFAULT_ROOT = "D:\\gululu-cache\\output\\opus-88-owner-only-refetch-v3";
const DEFAULT_BASE_URL = "https://api.asxs.top/v1";
const DEFAULT_MODEL = "gpt-5.5";
const IMAGE_EXTENSIONS = new Set([".png"]);
const SUPPORTED_ASSET_KINDS = new Set([
  "character-avatar-bust",
  "character-avatar-chat",
  "manga-avatar",
]);
const APPROVED_EXISTING_ROLES = new Set(["八意永琳", "风见幽香", "博丽灵梦"]);
const ROLE_ALIASES = new Map([
  ["阿空", "灵乌路空"],
  ["阿燐", "火焰猫燐"],
  ["阿求", "稗田阿求"],
  ["爱丽丝", "爱丽丝·玛格特洛依德"],
  ["白莲", "圣白莲"],
  ["布都", "物部布都"],
  ["弁弁", "九十九弁弁"],
  ["八桥", "九十九八桥"],
  ["堇子", "宇佐见堇子"],
  ["董子", "宇佐见堇子"],
  ["辉夜", "蓬莱山辉夜"],
  ["慧音", "上白泽慧音"],
  ["合欢乃", "坂田合欢乃"],
  ["华扇", "茨木华扇"],
  ["荷取", "河城荷取"],
  ["觉", "古明地觉"],
  ["影狼", "今泉影狼"],
  ["雷鼓", "堀川雷鼓"],
  ["蓝", "八云蓝"],
  ["老郭", "郭海皇"],
  ["灵梦", "博丽灵梦"],
  ["烈", "烈海王"],
  ["妹红", "藤原妹红"],
  ["米斯蒂娅", "米斯蒂娅·萝蕾拉"],
  ["魔理沙", "雾雨魔理沙"],
  ["猯藏", "二岩猯藏"],
  ["青娥", "霍青娥"],
  ["神奈子", "八坂神奈子"],
  ["神子", "丰聪耳神子"],
  ["四季", "四季映姬"],
  ["探女", "稀神探女"],
  ["针妙丸", "少名针妙丸"],
  ["永琳", "八意永琳"],
  ["师匠", "八意永琳"],
  ["太子", "丰聪耳神子"],
  ["天子", "比那名居天子"],
  ["文文", "射命丸文"],
  ["小伞", "多多良小伞"],
  ["咲夜", "十六夜咲夜"],
  ["一轮", "云居一轮"],
  ["妖梦", "魂魄妖梦"],
  ["幽香", "风见幽香"],
  ["幽幽子", "西行寺幽幽子"],
  ["勇仪", "星熊勇仪"],
  ["早苗", "东风谷早苗"],
  ["茨华仙", "茨木华扇"],
  ["恋恋", "古明地恋"],
  ["梦烈", "烈海王"],
  ["鵺", "封兽鵺"],
  ["芙兰", "芙兰朵露·斯卡雷特"],
  ["芙兰朵露", "芙兰朵露·斯卡雷特"],
  ["霖之助", "森近霖之助"],
  ["正邪", "鬼人正邪"],
  ["紫", "八云紫"],
  ["紫苑", "依神紫苑"],
  ["女苑", "依神女苑"],
  ["萃香", "伊吹萃香"],
]);

function parseArgs(argv) {
  const args = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--"))
      continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, "true");
      continue;
    }
    args.set(key, next);
    index += 1;
  }
  const root = path.resolve(args.get("root") ?? DEFAULT_ROOT);
  return {
    baseUrl: (args.get("base-url") ?? process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
    allowFallback: args.has("allow-fallback"),
    batchSize: Math.max(1, Math.min(30, Number(args.get("batch-size") ?? 18) || 18)),
    concurrency: Math.max(1, Math.min(10, Number(args.get("concurrency") ?? 3) || 3)),
    dryRun: args.has("dry-run"),
    force: args.has("force"),
    imageDetail: args.get("image-detail") ?? "low",
    limitJobs: args.has("limit-jobs") ? Number(args.get("limit-jobs")) : Number.POSITIVE_INFINITY,
    model: args.get("model") ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    noAi: args.has("no-ai"),
    root,
    skipApproved: !args.has("include-approved"),
    timeoutMs: Number(args.get("timeout-ms") ?? 120000),
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\"") {
      if (quoted && text[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      }
      else {
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
      if (char === "\r" && text[index + 1] === "\n")
        index += 1;
      row.push(cell);
      if (row.some(value => value !== ""))
        rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some(value => value !== ""))
    rows.push(row);
  const [headers, ...body] = rows;
  if (!headers)
    return [];
  return body.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function csvCell(value) {
  const text = Array.isArray(value) || (value && typeof value === "object")
    ? JSON.stringify(value)
    : String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map(row => columns.map(column => csvCell(row[column])).join(",")),
  ].join("\n");
}

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  }
  catch (error) {
    if (error?.code === "ENOENT")
      return null;
    throw error;
  }
}

function isProtectedNamedAvatarManifest(manifest, role) {
  if (APPROVED_EXISTING_ROLES.has(role))
    return true;
  const source = String(manifest?.source ?? "");
  if (source.startsWith("manual-"))
    return true;
  return Array.isArray(manifest?.items)
    && manifest.items.some(item => String(item?.reviewStatus ?? "").startsWith("manual-"));
}

function normalizeRole(role) {
  const text = String(role ?? "").trim();
  return ROLE_ALIASES.get(text) ?? text;
}

function splitPipe(value) {
  return String(value ?? "").split("|").map(item => item.trim()).filter(Boolean);
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  }
  catch {
    return false;
  }
}

function normalizeSourceRelPath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\/+/, "");
}

function sourceAbsPath(root, sourceRelPath) {
  return path.join(root, "images", normalizeSourceRelPath(sourceRelPath).replaceAll("/", path.sep));
}

function uniqueSourceRelPaths(member) {
  const seen = new Set();
  const result = [];
  for (const relPath of [member.sourceRelPath, ...(member.aggregatedSourceRelPaths ?? [])]) {
    const normalized = normalizeSourceRelPath(relPath);
    if (!normalized || seen.has(normalized))
      continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function sourceCandidateFileName({ id, prefix, sourceIndex, sourceRelPath }) {
  const ext = path.extname(sourceRelPath).toLowerCase() || ".png";
  const stem = path.basename(sourceRelPath, ext)
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "source";
  return `${prefix}_SOURCE__${id}__S${String(sourceIndex + 1).padStart(3, "0")}__${stem}${ext}`;
}

async function copySourceCandidates({ groupDir, id, member, prefix, root }) {
  const candidates = [];
  const relPaths = uniqueSourceRelPaths(member);
  for (let index = 0; index < relPaths.length; index += 1) {
    const sourceRelPath = relPaths[index];
    const absPath = sourceAbsPath(root, sourceRelPath);
    const file = sourceCandidateFileName({ id, prefix, sourceIndex: index, sourceRelPath });
    if (!await pathExists(absPath)) {
      candidates.push({ copied: false, file, sourceRelPath });
      continue;
    }
    await fs.copyFile(absPath, path.join(groupDir, file));
    candidates.push({ copied: true, file, sourceRelPath });
  }
  return candidates;
}

function sanitizeToken(value, fallback) {
  const cleaned = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);
  return cleaned || fallback;
}

function semanticBaseFromLabel(label, assetKind) {
  const parts = [
    sanitizeToken(label.emotion, "neutral"),
    sanitizeToken(label.pose, "front"),
    sanitizeToken(label.eyes, "open"),
    sanitizeToken(label.gaze, "front"),
    sanitizeToken(label.mouth, "closed"),
  ];
  for (const key of ["blush", "shadow", "tears", "wound", "sweat", "modifier"]) {
    const value = sanitizeToken(label[key], "");
    if (value && value !== "none" && !parts.includes(value))
      parts.push(value);
  }
  if (assetKind === "character-avatar-chat" && !parts.includes("chat"))
    parts.push("chat");
  if (assetKind === "manga-avatar" && !parts.includes("manga"))
    parts.push("manga");
  return parts.join("_").replace(/_+/g, "_").slice(0, 96);
}

function fallbackLabel(item, assetKind) {
  const suffix = item.id.toLowerCase();
  return {
    id: item.id,
    displayName: assetKind === "manga-avatar" ? `漫画头像 ${item.id}` : `待审头像 ${item.id}`,
    emotion: "uncertain",
    pose: "front",
    eyes: "unknown",
    gaze: "front",
    mouth: "unknown",
    affect: "uncertain",
    blush: "none",
    shadow: "none",
    tears: "none",
    wound: "none",
    sweat: "none",
    modifier: suffix,
    confidence: 0,
    notes: "vision-label-fallback",
  };
}

function extractJsonObject(text) {
  const raw = String(text ?? "").trim();
  try {
    return JSON.parse(raw);
  }
  catch {
    const fenced = raw.match(/```(?:json)?\n([\s\S]*?)```/i)?.[1];
    if (fenced)
      return JSON.parse(fenced);
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start)
      return JSON.parse(raw.slice(start, end + 1));
    throw new Error(`无法解析 JSON: ${raw.slice(0, 200)}`);
  }
}

async function imageToSheetDataUrl(items) {
  const cellW = 210;
  const imgH = 180;
  const labelH = 42;
  const gap = 10;
  const cols = Math.min(6, Math.max(1, items.length));
  const rows = Math.ceil(items.length / cols);
  const width = cols * cellW + (cols + 1) * gap;
  const height = rows * (imgH + labelH) + (rows + 1) * gap;
  const composites = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const col = index % cols;
    const row = Math.floor(index / cols);
    const left = gap + col * (cellW + gap);
    const top = gap + row * (imgH + labelH + gap);
    composites.push({ input: await checkerSvg(cellW, imgH), left, top });
    composites.push({
      input: await sharp(item.absPath, { failOn: "none" })
        .rotate()
        .resize({ width: cellW, height: imgH, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
      left,
      top,
    });
    const label = `${item.id} ${item.fileName.slice(0, 24)}`;
    composites.push({
      input: Buffer.from(`<svg width="${cellW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f6f6f6"/><text x="6" y="18" font-family="Arial, sans-serif" font-size="13" fill="#111">${escapeXml(label)}</text><text x="6" y="34" font-family="Arial, sans-serif" font-size="11" fill="#555">${item.width ?? "?"}x${item.height ?? "?"}</text></svg>`),
      left,
      top: top + imgH,
    });
  }
  const png = await sharp({ create: { width, height, channels: 4, background: "#ffffff" } })
    .composite(composites)
    .png()
    .toBuffer();
  return {
    dataUrl: `data:image/png;base64,${png.toString("base64")}`,
    png,
  };
}

async function checkerSvg(width, height, size = 12) {
  return sharp(Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="c" width="${size * 2}" height="${size * 2}" patternUnits="userSpaceOnUse"><rect width="${size}" height="${size}" fill="#eeeeee"/><rect x="${size}" y="${size}" width="${size}" height="${size}" fill="#eeeeee"/><rect x="${size}" width="${size}" height="${size}" fill="#ffffff"/><rect y="${size}" width="${size}" height="${size}" fill="#ffffff"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`)).png().toBuffer();
}

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]));
}

async function callVision({ args, apiKey, job, batch, dataUrl }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  const prompt = [
    "你是用于安科文 replay 头像资源整理的视觉标注器。",
    "请只根据 contact sheet 中每个编号头像的可见表情/状态输出 JSON。",
    "不要合并，不要漏项；每个编号必须有一条记录。",
    "使用小写英文受控词描述字段；中文 displayName 供人工审查。",
    "重点区分：脸红、阴影眼、受伤、流泪、汗、惊恐、嘴型、睁眼/闭眼/半睁。",
    "如果看不清，用 unknown/uncertain，不要编造。",
    `角色: ${job.role}`,
    `assetKind: ${job.assetKind}`,
    `编号: ${batch.map(item => item.id).join(", ")}`,
    "返回格式：{\"items\":[{\"id\":\"I001\",\"displayName\":\"中文短名\",\"emotion\":\"neutral|happy|sad|angry|surprised|frightened|embarrassed|calm|sleepy|sly|worried|pain|uncertain\",\"pose\":\"front|tilted|side|profile|three_quarter|unknown\",\"eyes\":\"open|closed|half_lidded|wide|shadowed|unknown\",\"gaze\":\"front|side|down|up|unknown\",\"mouth\":\"closed|smile|open|small_o|grimace|pout|shout|unknown\",\"affect\":\"英文短状态\",\"blush\":\"none|light|strong\",\"shadow\":\"none|light|strong\",\"tears\":\"none|visible\",\"wound\":\"none|visible\",\"sweat\":\"none|visible\",\"modifier\":\"可选英文短词\",\"confidence\":0.0,\"notes\":\"可选\"}]}",
  ].join("\n");

  try {
    const response = await fetch(`${args.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: args.model,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl, detail: args.imageDetail } },
          ],
        }],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) {
      const error = new Error(`vision api ${response.status}: ${body.slice(0, 400)}`);
      error.status = response.status;
      throw error;
    }
    return extractJsonObject(JSON.parse(body).choices?.[0]?.message?.content ?? "");
  }
  finally {
    clearTimeout(timeout);
  }
}

async function callVisionWithRetry(params) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await callVision(params);
    }
    catch (error) {
      lastError = error;
      const status = Number(error.status);
      const retryable = status === 429 || status >= 500 || error.name === "AbortError";
      if (!retryable || attempt === 5)
        break;
      const waitMs = 1500 * attempt * attempt;
      console.warn(`[retry] ${params.job.role}/${params.job.assetKind} attempt=${attempt} ${error.message.slice(0, 160)} wait=${waitMs}`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

async function listFilesRecursive(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...await listFilesRecursive(absPath));
    }
    else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      result.push(absPath);
    }
  }
  return result.sort((left, right) => left.localeCompare(right, "zh-CN"));
}

async function buildJobs(args) {
  const finalRoot = path.join(args.root, "image-role-review-clean-vision-final");
  const avatarsRoot = path.join(finalRoot, "avatars");
  const indexRows = parseCsv(await fs.readFile(path.join(finalRoot, "index.csv"), "utf8"));
  const rowsByOutput = new Map(indexRows.map(row => [row.outputRelPath.replaceAll("\\", "/"), row]));
  const roleDirs = await fs.readdir(avatarsRoot, { withFileTypes: true });
  const itemsByJob = new Map();

  for (const roleEntry of roleDirs) {
    if (!roleEntry.isDirectory())
      continue;
    const roleDir = roleEntry.name;
    const assetEntries = await fs.readdir(path.join(avatarsRoot, roleDir), { withFileTypes: true });
    for (const assetEntry of assetEntries) {
      if (!assetEntry.isDirectory() || !SUPPORTED_ASSET_KINDS.has(assetEntry.name))
        continue;
      const assetKind = assetEntry.name;
      const assetDir = path.join(avatarsRoot, roleDir, assetKind);
      const files = await listFilesRecursive(assetDir);
      for (const absPath of files) {
        const finalOutputRelPath = path.relative(finalRoot, absPath).replaceAll("\\", "/");
        const row = rowsByOutput.get(finalOutputRelPath) ?? {};
        const role = normalizeRole(row.character || roleDir);
        if (!role)
          continue;
        const key = `${role}\u0000${assetKind}`;
        if (!itemsByJob.has(key)) {
          itemsByJob.set(key, { role, assetKind, sourceRoleDirs: new Set(), items: [] });
        }
        const stat = await fs.stat(absPath);
        const meta = await sharp(absPath, { failOn: "none" }).metadata();
        const data = await fs.readFile(absPath);
        const job = itemsByJob.get(key);
        job.sourceRoleDirs.add(roleDir);
        job.items.push({
          absPath,
          aggregatedSourceRelPaths: splitPipe(row.aggregatedSourceRelPaths),
          assetKind,
          bytes: stat.size,
          fileName: path.basename(absPath),
          finalOutputRelPath,
          height: meta.height,
          id: "",
          indexRow: row,
          role,
          sha256: crypto.createHash("sha256").update(data).digest("hex"),
          sourceRelPath: row.sourceRelPath || "",
          sourceRoleDir: roleDir,
          width: meta.width,
        });
      }
    }
  }

  return [...itemsByJob.values()]
    .map(job => ({
      ...job,
      sourceRoleDirs: [...job.sourceRoleDirs].sort((left, right) => left.localeCompare(right, "zh-CN")),
      items: job.items
        .sort((left, right) => left.finalOutputRelPath.localeCompare(right.finalOutputRelPath, "zh-CN"))
        .map((item, index) => ({ ...item, id: `I${String(index + 1).padStart(3, "0")}` })),
    }))
    .filter(job => job.items.length > 0)
    .sort((left, right) => `${left.role}/${left.assetKind}`.localeCompare(`${right.role}/${right.assetKind}`, "zh-CN"));
}

async function ensureCleanDir(dir, allowedRoot) {
  const resolved = path.resolve(dir);
  const allowed = path.resolve(allowedRoot);
  if (!resolved.startsWith(allowed)) {
    throw new Error(`拒绝清理输出根之外的目录: ${dir}`);
  }
  await fs.rm(resolved, { recursive: true, force: true });
  await fs.mkdir(resolved, { recursive: true });
}

async function processJob({ args, apiKey, finalRoot, reportRoot, job }) {
  const outDir = path.join(finalRoot, "named-avatars", job.role, job.assetKind);
  const manifestPath = path.join(outDir, "avatar-manifest.json");
  const existingManifest = await readJsonIfExists(manifestPath);
  if (!args.force && existingManifest) {
    return { role: job.role, assetKind: job.assetKind, skipped: true, reason: "exists", sourceCount: job.items.length };
  }
  if (args.skipApproved && isProtectedNamedAvatarManifest(existingManifest, job.role)) {
    return { role: job.role, assetKind: job.assetKind, skipped: true, reason: "approved-existing", sourceCount: job.items.length };
  }
  const jobReportDir = path.join(reportRoot, "jobs", job.role, job.assetKind);
  if (args.dryRun) {
    return { role: job.role, assetKind: job.assetKind, dryRun: true, sourceCount: job.items.length, outputDir: outDir };
  }
  await ensureCleanDir(outDir, path.join(finalRoot, "named-avatars"));
  await ensureCleanDir(jobReportDir, path.join(reportRoot, "jobs"));
  await fs.mkdir(path.join(outDir, "_interchangeable"), { recursive: true });

  const labelsById = new Map();
  const batches = [];
  for (let index = 0; index < job.items.length; index += args.batchSize) {
    batches.push(job.items.slice(index, index + args.batchSize));
  }
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const sheet = await imageToSheetDataUrl(batch);
    await fs.writeFile(path.join(jobReportDir, `batch-${String(batchIndex + 1).padStart(3, "0")}.png`), sheet.png);
    let payload = null;
    let errorText = "";
    if (!args.noAi) {
      try {
        payload = await callVisionWithRetry({ args, apiKey, job, batch, dataUrl: sheet.dataUrl });
      }
      catch (error) {
        errorText = String(error?.message ?? error);
        if (!args.allowFallback)
          throw error;
        console.warn(`[fallback] ${job.role}/${job.assetKind}/batch-${batchIndex + 1}: ${errorText.slice(0, 240)}`);
      }
    }
    const labelRows = Array.isArray(payload?.items) ? payload.items : [];
    const labelById = new Map(labelRows.map(label => [String(label.id ?? "").trim(), label]));
    for (const item of batch) {
      labelsById.set(item.id, labelById.get(item.id) ?? fallbackLabel(item, job.assetKind));
    }
    await fs.writeFile(path.join(jobReportDir, `batch-${String(batchIndex + 1).padStart(3, "0")}.labels.json`), JSON.stringify({
      error: errorText,
      ids: batch.map(item => item.id),
      labels: batch.map(item => labelsById.get(item.id)),
      model: args.noAi ? "fallback-no-ai" : args.model,
    }, null, 2));
  }

  const usedBaseCounts = new Map();
  const manifestItems = [];
  const csvRows = [];
  const previewItems = [];
  for (const item of job.items) {
    const label = labelsById.get(item.id) ?? fallbackLabel(item, job.assetKind);
    const base = semanticBaseFromLabel(label, job.assetKind);
    const next = (usedBaseCounts.get(base) ?? 0) + 1;
    usedBaseCounts.set(base, next);
    const versionedUsageKey = `${base}__v${String(next).padStart(3, "0")}`;
    const outputFile = `${versionedUsageKey}.png`;
    await fs.copyFile(item.absPath, path.join(outDir, outputFile));
    const groupDir = path.join(outDir, "_interchangeable", versionedUsageKey);
    await fs.mkdir(groupDir, { recursive: true });
    await fs.copyFile(item.absPath, path.join(groupDir, `KEEP__${item.id}__${item.fileName}`));
    const sourceCandidates = await copySourceCandidates({ groupDir, id: item.id, member: item, prefix: "KEEP", root: args.root });

    const stateSignature = {
      affect: sanitizeToken(label.affect, "uncertain"),
      blush: sanitizeToken(label.blush, "none"),
      emotion: sanitizeToken(label.emotion, "uncertain"),
      eyes: sanitizeToken(label.eyes, "unknown"),
      gaze: sanitizeToken(label.gaze, "unknown"),
      modifier: sanitizeToken(label.modifier, ""),
      mouth: sanitizeToken(label.mouth, "unknown"),
      pose: sanitizeToken(label.pose, "front"),
      shadow: sanitizeToken(label.shadow, "none"),
      sweat: sanitizeToken(label.sweat, "none"),
      tears: sanitizeToken(label.tears, "none"),
      wound: sanitizeToken(label.wound, "none"),
    };
    const entry = {
      file: outputFile,
      usageKey: base,
      versionedUsageKey,
      displayName: String(label.displayName ?? "").trim() || `待审头像 ${item.id}`,
      role: job.role,
      assetKind: job.assetKind,
      ...stateSignature,
      confidence: Number(label.confidence) || 0,
      reviewStatus: Number(label.confidence) >= 0.75 ? "ai-labeled" : "needs-human-review",
      namingSource: args.noAi ? "fallback-no-ai" : args.model,
      representativeId: item.id,
      representativeOriginalFile: item.fileName,
      representativeSourceRelPath: item.sourceRelPath,
      representativeFinalOutputRelPath: item.finalOutputRelPath,
      representativeSha256: item.sha256,
      memberCount: 1,
      sourceCandidateCount: sourceCandidates.filter(candidate => candidate.copied).length,
      members: [{
        id: item.id,
        fileName: item.fileName,
        finalOutputRelPath: item.finalOutputRelPath,
        sourceRelPath: item.sourceRelPath,
        aggregatedSourceRelPaths: item.aggregatedSourceRelPaths,
        sourceCandidateCount: sourceCandidates.filter(candidate => candidate.copied).length,
        sourceCandidates,
        sha256: item.sha256,
        width: item.width,
        height: item.height,
        stateSignature,
      }],
      notes: String(label.notes ?? "").trim(),
    };
    manifestItems.push(entry);
    csvRows.push({
      file: outputFile,
      usageKey: base,
      versionedUsageKey,
      displayName: entry.displayName,
      assetKind: job.assetKind,
      representativeId: item.id,
      representativeOriginalFile: item.fileName,
      representativeSourceRelPath: item.sourceRelPath,
      memberCount: 1,
      sourceCandidateCount: entry.sourceCandidateCount,
      emotion: entry.emotion,
      eyes: entry.eyes,
      mouth: entry.mouth,
      blush: entry.blush,
      shadow: entry.shadow,
      reviewStatus: entry.reviewStatus,
      confidence: entry.confidence,
      notes: entry.notes,
    });
    await fs.writeFile(path.join(groupDir, "group.json"), JSON.stringify(entry, null, 2), "utf8");
    previewItems.push({ ...item, outputFile, displayName: entry.displayName, versionedUsageKey });
  }

  const manifest = {
    role: job.role,
    sourceRoleDirs: job.sourceRoleDirs,
    assetKind: job.assetKind,
    generatedAt: new Date().toISOString(),
    count: manifestItems.length,
    interchangeablePolicy: "safe-main-all: each source image remains in main directory; _interchangeable keeps KEEP evidence and expanded source candidates",
    items: manifestItems,
  };
  await fs.writeFile(path.join(outDir, "avatar-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const columns = Object.keys(csvRows[0] ?? {});
  await fs.writeFile(path.join(outDir, "avatar-manifest.csv"), `${toCsv(csvRows, columns)}\n`, "utf8");
  await fs.writeFile(path.join(outDir, "README.md"), [
    `# ${job.role} ${job.assetKind} named avatar review`,
    "",
    "这个目录是全量语义命名头像审查产物。",
    "",
    `- 角色：${job.role}`,
    `- 类型：${job.assetKind}`,
    `- 主图数量：${manifestItems.length}`,
    "- 折叠策略：保守模式，每张最终头像都保留在主目录；`_interchangeable/` 保存 KEEP 证据、展开后的来源候选和 `group.json`。",
    "- 演出和导入脚本应读取 `avatar-manifest.json`，不要直接猜文件名。",
    "",
  ].join("\n"), "utf8");
  await writePreviewSheet(path.join(jobReportDir, "preview-main-sheet.png"), previewItems);
  return {
    role: job.role,
    assetKind: job.assetKind,
    sourceCount: job.items.length,
    namedCount: manifestItems.length,
    hiddenAltCount: 0,
    sourceCandidateCount: manifestItems.reduce((sum, item) => sum + item.sourceCandidateCount, 0),
    outputDir: outDir,
  };
}

async function writePreviewSheet(outPath, items) {
  const cellW = 220;
  const imgH = 190;
  const labelH = 54;
  const gap = 10;
  const cols = Math.min(5, Math.max(1, items.length));
  const rows = Math.ceil(items.length / cols);
  const width = cols * cellW + (cols + 1) * gap;
  const height = rows * (imgH + labelH) + (rows + 1) * gap;
  const composites = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const col = index % cols;
    const row = Math.floor(index / cols);
    const left = gap + col * (cellW + gap);
    const top = gap + row * (imgH + labelH + gap);
    composites.push({ input: await checkerSvg(cellW, imgH), left, top });
    composites.push({
      input: await sharp(item.absPath, { failOn: "none" })
        .resize({ width: cellW, height: imgH, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
      left,
      top,
    });
    const label = Buffer.from(`<svg width="${cellW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f6f6f6"/><text x="6" y="17" font-family="Arial, sans-serif" font-size="12" fill="#111">${escapeXml(item.versionedUsageKey.slice(0, 32))}</text><text x="6" y="35" font-family="Arial, sans-serif" font-size="12" fill="#555">${escapeXml(`${item.displayName} / ${item.id}`)}</text></svg>`);
    composites.push({ input: label, left, top: top + imgH });
  }
  await sharp({ create: { width, height, channels: 4, background: "#ffffff" } })
    .composite(composites)
    .png()
    .toFile(outPath);
}

async function runWithConcurrency(items, concurrency, worker) {
  let cursor = 0;
  const results = [];
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function updateSummary(finalRoot, results) {
  const summaryPath = path.join(finalRoot, "summary.json");
  const summary = JSON.parse(await fs.readFile(summaryPath, "utf8"));
  summary.namedAvatars = summary.namedAvatars || {};
  for (const result of results) {
    if (!result || result.skipped || result.dryRun)
      continue;
    summary.namedAvatars[result.role] = summary.namedAvatars[result.role] || {};
    summary.namedAvatars[result.role][result.assetKind] = {
      sourceCount: result.sourceCount,
      namedCount: result.namedCount,
      interchangeableGroups: result.namedCount,
      hiddenAltCount: result.hiddenAltCount,
      sourceCandidateCount: result.sourceCandidateCount,
      outputDir: result.outputDir.replaceAll("\\", "/"),
    };
  }
  summary.namedAvatarsUpdatedAt = new Date().toISOString();
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!args.noAi && !apiKey) {
    throw new Error("OPENAI_API_KEY 未设置；如只想生成待审占位命名，请加 --no-ai");
  }
  const finalRoot = path.join(args.root, "image-role-review-clean-vision-final");
  const reportRoot = path.join(finalRoot, "reports", "named-avatar-generation", "all-roles");
  await fs.mkdir(reportRoot, { recursive: true });
  let jobs = await buildJobs(args);
  if (Number.isFinite(args.limitJobs))
    jobs = jobs.slice(0, args.limitJobs);
  await fs.writeFile(path.join(reportRoot, "job-inventory.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: jobs.length,
    jobs: jobs.map(job => ({
      role: job.role,
      assetKind: job.assetKind,
      sourceRoleDirs: job.sourceRoleDirs,
      count: job.items.length,
    })),
  }, null, 2), "utf8");
  console.log(`[named-avatar] jobs=${jobs.length} concurrency=${args.concurrency} dryRun=${args.dryRun} noAi=${args.noAi}`);
  const results = await runWithConcurrency(jobs, args.concurrency, async (job, index) => {
    console.log(`[job ${index + 1}/${jobs.length}] ${job.role}/${job.assetKind} count=${job.items.length}`);
    return processJob({ args, apiKey, finalRoot, reportRoot, job });
  });
  await fs.writeFile(path.join(reportRoot, "run-summary.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    model: args.noAi ? "fallback-no-ai" : args.model,
    count: results.length,
    results,
  }, null, 2), "utf8");
  if (!args.dryRun)
    await updateSummary(finalRoot, results);
  const completed = results.filter(result => result && !result.skipped && !result.dryRun).length;
  const skipped = results.filter(result => result?.skipped).length;
  console.log(`[named-avatar] completed=${completed} skipped=${skipped} report=${reportRoot}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
