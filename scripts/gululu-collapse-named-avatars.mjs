#!/usr/bin/env node

import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const DEFAULT_ROOT = "D:\\gululu-cache\\output\\opus-88-owner-only-refetch-v3";
const DEFAULT_BASE_URL = "https://api.asxs.top/v1";
const DEFAULT_MODEL = "gpt-5.5";
const APPROVED_EXISTING_ROLES = new Set(["八意永琳", "风见幽香", "博丽灵梦"]);

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
    concurrency: Math.max(1, Math.min(10, Number(args.get("concurrency") ?? 5) || 5)),
    dryRun: args.has("dry-run"),
    force: args.has("force"),
    imageDetail: args.get("image-detail") ?? "high",
    includeApproved: args.has("include-approved"),
    onlyAssetKind: args.get("asset-kind") ?? "",
    onlyRole: args.get("role") ?? "",
    limitJobs: args.has("limit-jobs") ? Number(args.get("limit-jobs")) : Number.POSITIVE_INFINITY,
    model: args.get("model") ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    root,
    timeoutMs: Number(args.get("timeout-ms") ?? 120000),
  };
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

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]));
}

function sanitizeToken(value, fallback) {
  const cleaned = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return cleaned || fallback;
}

function normalizeUsageKey(value, assetKind) {
  const base = String(value ?? "")
    .toLowerCase()
    .replace(/__v\d+$/i, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
  const fallback = assetKind === "manga-avatar" ? "uncertain_manga" : "uncertain_avatar";
  return base || fallback;
}

function groupKeyFromEntry(entry) {
  const parts = [
    entry.emotion,
    entry.pose,
    entry.eyes,
    entry.gaze,
    entry.mouth,
    entry.blush,
    entry.shadow,
    entry.tears,
    entry.wound,
    entry.sweat,
  ].map((value, index) => sanitizeToken(value, index === 0 ? "uncertain" : "none"));
  return parts.join("_").replace(/_+/g, "_");
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

async function checkerSvg(width, height, size = 12) {
  return sharp(Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="c" width="${size * 2}" height="${size * 2}" patternUnits="userSpaceOnUse"><rect width="${size}" height="${size}" fill="#eeeeee"/><rect x="${size}" y="${size}" width="${size}" height="${size}" fill="#eeeeee"/><rect x="${size}" width="${size}" height="${size}" fill="#ffffff"/><rect y="${size}" width="${size}" height="${size}" fill="#ffffff"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`)).png().toBuffer();
}

async function makeSheet(items, dir) {
  const cellW = 190;
  const imgH = 170;
  const labelH = 54;
  const gap = 8;
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
    const imagePath = path.join(dir, item.file);
    composites.push({ input: await checkerSvg(cellW, imgH), left, top });
    composites.push({
      input: await sharp(imagePath, { failOn: "none" })
        .rotate()
        .resize({ width: cellW, height: imgH, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
      left,
      top,
    });
    const label = Buffer.from(`<svg width="${cellW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f6f6f6"/><text x="5" y="16" font-family="Arial, sans-serif" font-size="12" fill="#111">${escapeXml(item.id)} ${escapeXml(item.displayName).slice(0, 12)}</text><text x="5" y="33" font-family="Arial, sans-serif" font-size="10" fill="#555">${escapeXml(item.versionedUsageKey ?? item.file).slice(0, 34)}</text><text x="5" y="48" font-family="Arial, sans-serif" font-size="10" fill="#777">${escapeXml(`${item.emotion}/${item.eyes}/${item.mouth}/${item.blush}/${item.shadow}`).slice(0, 34)}</text></svg>`);
    composites.push({ input: label, left, top: top + imgH });
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

async function callVision({ apiKey, args, dataUrl, job, items }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  const itemSummary = items.map(item => ({
    id: item.id,
    displayName: item.displayName,
    key: item.versionedUsageKey ?? item.file,
    emotion: item.emotion,
    eyes: item.eyes,
    gaze: item.gaze,
    mouth: item.mouth,
    blush: item.blush,
    shadow: item.shadow,
    tears: item.tears,
    wound: item.wound,
    sweat: item.sweat,
  }));
  const prompt = [
    "你在做咕噜噜 replay 头像去冗余。请按八意永琳、风见幽香已经确认的标准，把 contact sheet 中可互相替代的头像分组。",
    "目标：主目录只留代表图，其他同语义成员放入 _interchangeable。允许保留冗余，但不允许漏掉语义差异。",
    "可以合并：同一角色、同一表情/情绪/状态，只是裁切、缩放、画布大小、黑底/白底/透明边、分辨率、压缩、轻微线条差异、是否露出更多身体。",
    "必须拆开：脸红及强度不同、阴影眼/黑影不同、受伤/血/泪/汗不同、惊恐/害羞/愤怒等情绪不同、睁眼/闭眼/半睁/瞪眼不同、嘴型不同（闭嘴/微笑/张口/小口/咬牙/嘟嘴）、明显视线方向不同。",
    "如果你不确定两个能否互换，分开。",
    `角色: ${job.role}`,
    `assetKind: ${job.assetKind}`,
    `编号: ${items.map(item => item.id).join(", ")}`,
    `当前语义标签: ${JSON.stringify(itemSummary)}`,
    "返回 JSON：{\"groups\":[{\"usageKey\":\"english_snake_case_without_version\",\"displayName\":\"中文短名\",\"representativeId\":\"I001\",\"memberIds\":[\"I001\",\"I003\"],\"reason\":\"为什么这些可互换\"}]}",
    "每个编号必须且只能出现一次。usageKey 用英文受控词描述代表语义，不要包含 cropped/full/closeup/black/white/transparent。",
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
      const retryable = isRetryableVisionError(error);
      if (!retryable || attempt === 5)
        break;
      const waitMs = 1500 * attempt * attempt;
      console.warn(`[retry] ${params.job.role}/${params.job.assetKind} attempt=${attempt} ${error.message.slice(0, 180)} wait=${waitMs}`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

function isRetryableVisionError(error) {
  const status = Number(error.status);
  const code = error?.cause?.code || error?.code;
  return status === 429
    || status >= 500
    || error?.name === "AbortError"
    || ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "UND_ERR_SOCKET"].includes(code)
    || String(error?.message ?? "").includes("fetch failed");
}

function normalizeGroups(payload, items, assetKind) {
  const byId = new Map(items.map(item => [item.id, item]));
  const seen = new Set();
  const groups = [];
  const rawGroups = Array.isArray(payload?.groups) ? payload.groups : [];
  for (const raw of rawGroups) {
    const memberIds = Array.isArray(raw.memberIds)
      ? raw.memberIds.map(id => String(id).trim()).filter(id => byId.has(id) && !seen.has(id))
      : [];
    if (memberIds.length === 0)
      continue;
    for (const id of memberIds) seen.add(id);
    const representativeId = memberIds.includes(String(raw.representativeId ?? "").trim())
      ? String(raw.representativeId).trim()
      : memberIds[0];
    groups.push({
      displayName: String(raw.displayName ?? byId.get(representativeId)?.displayName ?? "").trim() || byId.get(representativeId).displayName,
      memberIds,
      reason: String(raw.reason ?? "").trim(),
      representativeId,
      usageKey: normalizeUsageKey(raw.usageKey || groupKeyFromEntry(byId.get(representativeId)), assetKind),
    });
  }
  for (const item of items) {
    if (seen.has(item.id))
      continue;
    groups.push({
      displayName: item.displayName,
      memberIds: [item.id],
      reason: "模型未覆盖，保守单独保留",
      representativeId: item.id,
      usageKey: normalizeUsageKey(item.usageKey || item.versionedUsageKey || groupKeyFromEntry(item), assetKind),
    });
  }
  return groups;
}

async function listJobs(finalRoot, args) {
  const namedRoot = path.join(finalRoot, "named-avatars");
  const roles = await fs.readdir(namedRoot, { withFileTypes: true });
  const jobs = [];
  for (const roleEntry of roles) {
    if (!roleEntry.isDirectory())
      continue;
    const role = roleEntry.name;
    if (!args.includeApproved && APPROVED_EXISTING_ROLES.has(role))
      continue;
    const roleDir = path.join(namedRoot, role);
    const kinds = await fs.readdir(roleDir, { withFileTypes: true });
    for (const kindEntry of kinds) {
      if (!kindEntry.isDirectory())
        continue;
      const assetKind = kindEntry.name;
      const dir = path.join(roleDir, assetKind);
      const manifestPath = path.join(dir, "avatar-manifest.json");
      if (!await pathExists(manifestPath))
        continue;
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      if (!args.includeApproved && isProtectedNamedAvatarManifest(manifest, role))
        continue;
      jobs.push({
        assetKind,
        dir,
        manifest,
        role,
      });
    }
  }
  return jobs.sort((left, right) => `${left.role}/${left.assetKind}`.localeCompare(`${right.role}/${right.assetKind}`, "zh-CN"));
}

async function ensureCleanDir(dir, allowedRoot) {
  const resolved = path.resolve(dir);
  const allowed = path.resolve(allowedRoot);
  if (!resolved.startsWith(allowed))
    throw new Error(`拒绝清理输出根之外的目录: ${dir}`);
  await fs.rm(resolved, { recursive: true, force: true });
  await fs.mkdir(resolved, { recursive: true });
}

async function processJob({ apiKey, args, finalRoot, job, reportRoot }) {
  const items = job.manifest.items.map((item, index) => ({
    ...item,
    id: `I${String(index + 1).padStart(3, "0")}`,
    oldFile: item.file,
  }));
  if (items.length <= 1 && !args.force) {
    return { role: job.role, assetKind: job.assetKind, skipped: true, reason: "single", sourceCount: items.length };
  }
  const jobReportDir = path.join(reportRoot, "jobs", job.role, job.assetKind);
  await fs.mkdir(jobReportDir, { recursive: true });
  await fs.writeFile(path.join(jobReportDir, "input-manifest.json"), JSON.stringify(job.manifest, null, 2), "utf8");
  const sheet = await makeSheet(items, job.dir);
  await fs.writeFile(path.join(jobReportDir, "collapse-input-sheet.png"), sheet.png);
  if (args.dryRun) {
    return { role: job.role, assetKind: job.assetKind, dryRun: true, sourceCount: items.length };
  }
  const payload = await callVisionWithRetry({ apiKey, args, dataUrl: sheet.dataUrl, job, items });
  await fs.writeFile(path.join(jobReportDir, "collapse-groups.raw.json"), JSON.stringify(payload, null, 2), "utf8");
  const groups = normalizeGroups(payload, items, job.assetKind);
  await fs.writeFile(path.join(jobReportDir, "collapse-groups.normalized.json"), JSON.stringify(groups, null, 2), "utf8");

  const tempDir = path.join(job.dir, `.__collapse_tmp_${Date.now()}`);
  await ensureCleanDir(tempDir, path.join(finalRoot, "named-avatars"));
  await fs.mkdir(path.join(tempDir, "_interchangeable"), { recursive: true });
  const byId = new Map(items.map(item => [item.id, item]));
  const usageCounts = new Map();
  const manifestItems = [];
  const csvRows = [];

  for (const group of groups) {
    const representative = byId.get(group.representativeId);
    if (!representative)
      continue;
    const base = normalizeUsageKey(group.usageKey, job.assetKind);
    const count = (usageCounts.get(base) ?? 0) + 1;
    usageCounts.set(base, count);
    const versionedUsageKey = `${base}__v${String(count).padStart(3, "0")}`;
    const file = `${versionedUsageKey}.png`;
    await fs.copyFile(path.join(job.dir, representative.oldFile), path.join(tempDir, file));
    const groupDir = path.join(tempDir, "_interchangeable", versionedUsageKey);
    await fs.mkdir(groupDir, { recursive: true });
    const members = [];
    for (const memberId of group.memberIds) {
      const member = byId.get(memberId);
      if (!member)
        continue;
      const prefix = memberId === representative.id ? "KEEP" : "ALT";
      await fs.copyFile(path.join(job.dir, member.oldFile), path.join(groupDir, `${prefix}__${memberId}__${member.oldFile}`));
      for (const rawMember of member.members ?? []) {
        members.push({
          ...rawMember,
          collapsedFromFile: member.oldFile,
          collapsedFromId: memberId,
          collapseReason: group.reason,
        });
      }
    }
    const entry = {
      ...representative,
      collapseReason: group.reason,
      displayName: group.displayName,
      file,
      interchangeableGroupId: group.memberIds.length > 1 ? versionedUsageKey : "",
      memberCount: members.length || group.memberIds.length,
      members: members.length ? members : group.memberIds.map(memberId => ({ collapsedFromId: memberId })),
      representativeId: representative.id,
      usageKey: base,
      versionedUsageKey,
    };
    delete entry.id;
    delete entry.oldFile;
    manifestItems.push(entry);
    csvRows.push({
      file,
      usageKey: base,
      versionedUsageKey,
      displayName: entry.displayName,
      assetKind: job.assetKind,
      representativeId: representative.id,
      representativeOriginalFile: representative.representativeOriginalFile,
      representativeSourceRelPath: representative.representativeSourceRelPath,
      memberCount: entry.memberCount,
      groupedIds: group.memberIds.join("|"),
      emotion: entry.emotion,
      eyes: entry.eyes,
      mouth: entry.mouth,
      blush: entry.blush,
      shadow: entry.shadow,
      collapseReason: group.reason,
    });
  }

  const nextManifest = {
    ...job.manifest,
    collapsedAt: new Date().toISOString(),
    collapsedFromCount: items.length,
    count: manifestItems.length,
    interchangeablePolicy: "vision-collapse-safe: crop/canvas/background variants may be hidden; semantic state differences stay in main",
    items: manifestItems,
  };
  await fs.writeFile(path.join(tempDir, "avatar-manifest.json"), JSON.stringify(nextManifest, null, 2), "utf8");
  const columns = Object.keys(csvRows[0] ?? {});
  await fs.writeFile(path.join(tempDir, "avatar-manifest.csv"), `${toCsv(csvRows, columns)}\n`, "utf8");
  await fs.writeFile(path.join(tempDir, "README.md"), [
    `# ${job.role} ${job.assetKind} named avatar review`,
    "",
    "这个目录是按可互相替代规则折叠后的语义命名头像审查产物。",
    "",
    `- 角色：${job.role}`,
    `- 类型：${job.assetKind}`,
    `- 折叠前主图：${items.length}`,
    `- 折叠后主图：${manifestItems.length}`,
    "- `_interchangeable/` 保存 KEEP/ALT 证据。",
    "- 演出和导入脚本应读取 `avatar-manifest.json`。",
    "",
  ].join("\n"), "utf8");
  await replaceDirectoryContents(job.dir, tempDir);
  await writePreviewSheet(path.join(jobReportDir, "collapse-preview-main-sheet.png"), job.dir, manifestItems);
  return {
    assetKind: job.assetKind,
    hiddenAltCount: items.length - manifestItems.length,
    namedCount: manifestItems.length,
    role: job.role,
    sourceCount: items.reduce((sum, item) => sum + (Number(item.memberCount) || 1), 0),
  };
}

async function replaceDirectoryContents(targetDir, tempDir) {
  const entries = await fs.readdir(targetDir);
  for (const entry of entries) {
    if (entry === path.basename(tempDir))
      continue;
    await fs.rm(path.join(targetDir, entry), { recursive: true, force: true });
  }
  for (const entry of await fs.readdir(tempDir)) {
    await fs.rename(path.join(tempDir, entry), path.join(targetDir, entry));
  }
  await fs.rm(tempDir, { recursive: true, force: true });
}

async function writePreviewSheet(outPath, dir, items) {
  const sheetItems = items.map((item, index) => ({ ...item, id: `G${String(index + 1).padStart(3, "0")}` }));
  const sheet = await makeSheet(sheetItems, dir);
  await fs.writeFile(outPath, sheet.png);
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

async function updateSummary(finalRoot) {
  const namedRoot = path.join(finalRoot, "named-avatars");
  const summaryPath = path.join(finalRoot, "summary.json");
  const summary = JSON.parse(await fs.readFile(summaryPath, "utf8"));
  const namedAvatars = {};
  let roleCount = 0;
  let kindCount = 0;
  let namedCount = 0;
  let sourceCount = 0;
  let hiddenAltCount = 0;
  for (const roleEntry of await fs.readdir(namedRoot, { withFileTypes: true })) {
    if (!roleEntry.isDirectory())
      continue;
    const role = roleEntry.name;
    roleCount += 1;
    namedAvatars[role] = {};
    for (const kindEntry of await fs.readdir(path.join(namedRoot, role), { withFileTypes: true })) {
      if (!kindEntry.isDirectory())
        continue;
      const assetKind = kindEntry.name;
      const dir = path.join(namedRoot, role, assetKind);
      const manifestPath = path.join(dir, "avatar-manifest.json");
      if (!await pathExists(manifestPath))
        continue;
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      const named = manifest.items.length;
      const source = manifest.items.reduce((sum, item) => sum + (Number(item.memberCount) || 1), 0);
      const hidden = source - named;
      const groupRoot = path.join(dir, "_interchangeable");
      const groups = await pathExists(groupRoot)
        ? (await fs.readdir(groupRoot, { withFileTypes: true })).filter(entry => entry.isDirectory()).length
        : 0;
      namedAvatars[role][assetKind] = {
        hiddenAltCount: hidden,
        interchangeableGroups: groups,
        namedCount: named,
        outputDir: dir.replaceAll("\\", "/"),
        sourceCount: source,
      };
      kindCount += 1;
      namedCount += named;
      sourceCount += source;
      hiddenAltCount += hidden;
    }
  }
  summary.namedAvatars = namedAvatars;
  summary.namedAvatarsTotals = { roleCount, kindCount, sourceCount, namedCount, hiddenAltCount };
  summary.namedAvatarsUpdatedAt = new Date().toISOString();
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !args.dryRun)
    throw new Error("OPENAI_API_KEY 未设置");
  const finalRoot = path.join(args.root, "image-role-review-clean-vision-final");
  const reportRoot = path.join(finalRoot, "reports", "named-avatar-collapse", "all-roles");
  await fs.mkdir(reportRoot, { recursive: true });
  let jobs = await listJobs(finalRoot, args);
  if (args.onlyRole)
    jobs = jobs.filter(job => job.role === args.onlyRole);
  if (args.onlyAssetKind)
    jobs = jobs.filter(job => job.assetKind === args.onlyAssetKind);
  if (Number.isFinite(args.limitJobs))
    jobs = jobs.slice(0, args.limitJobs);
  await fs.writeFile(path.join(reportRoot, "job-inventory.json"), JSON.stringify({
    count: jobs.length,
    generatedAt: new Date().toISOString(),
    jobs: jobs.map(job => ({
      assetKind: job.assetKind,
      count: job.manifest.items.length,
      role: job.role,
    })),
  }, null, 2), "utf8");
  console.log(`[collapse] jobs=${jobs.length} concurrency=${args.concurrency} dryRun=${args.dryRun}`);
  const results = await runWithConcurrency(jobs, args.concurrency, async (job, index) => {
    console.log(`[job ${index + 1}/${jobs.length}] ${job.role}/${job.assetKind} count=${job.manifest.items.length}`);
    return processJob({ apiKey, args, finalRoot, job, reportRoot });
  });
  await fs.writeFile(path.join(reportRoot, "run-summary.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    model: args.model,
    results,
  }, null, 2), "utf8");
  if (!args.dryRun)
    await updateSummary(finalRoot);
  const completed = results.filter(result => result && !result.skipped && !result.dryRun).length;
  const skipped = results.filter(result => result?.skipped).length;
  const hidden = results.reduce((sum, result) => sum + (Number(result?.hiddenAltCount) || 0), 0);
  console.log(`[collapse] completed=${completed} skipped=${skipped} hiddenAlt=${hidden} report=${reportRoot}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
