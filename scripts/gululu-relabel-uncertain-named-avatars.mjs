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
  return {
    allowFallback: args.has("allow-fallback"),
    apply: args.has("apply"),
    assetKinds: splitList(args.get("asset-kinds") ?? args.get("asset-kind")),
    baseUrl: (args.get("base-url") ?? process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
    batchSize: Math.max(1, Math.min(30, Number(args.get("batch-size") ?? 18) || 18)),
    dryRun: args.has("dry-run"),
    imageDetail: args.get("image-detail") ?? "low",
    includeRelabeled: args.has("include-relabeled"),
    limitItems: args.has("limit-items") ? Number(args.get("limit-items")) : Number.POSITIVE_INFINITY,
    limitJobs: args.has("limit-jobs") ? Number(args.get("limit-jobs")) : Number.POSITIVE_INFINITY,
    minConfidence: Math.max(0, Math.min(1, Number(args.get("min-confidence") ?? 0) || 0)),
    model: args.get("model") ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    roles: splitList(args.get("roles") ?? args.get("role")),
    root: path.resolve(args.get("root") ?? DEFAULT_ROOT),
    timeoutMs: Number(args.get("timeout-ms") ?? 120000),
  };
}

function splitList(value) {
  return new Set(String(value ?? "").split(/[|,，]/).map(item => item.trim()).filter(Boolean));
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

function isTransientFsError(error) {
  return ["EBUSY", "EPERM", "EXDEV"].includes(error?.code);
}

async function wait(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function moveFileSafely(source, target) {
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      await fs.rename(source, target);
      return;
    }
    catch (error) {
      lastError = error;
      if (!isTransientFsError(error))
        throw error;
      try {
        await fs.copyFile(source, target);
        await removePathWithRetry(source, { force: true });
        return;
      }
      catch (fallbackError) {
        lastError = fallbackError;
        if (await pathExists(target) && isTransientFsError(fallbackError)) {
          console.warn(`[cleanup-pending] copied target but could not remove locked source yet: ${source}`);
          return;
        }
        if (!isTransientFsError(fallbackError))
          throw fallbackError;
        await wait(150 * attempt * attempt);
      }
    }
  }
  throw lastError;
}

async function moveDirectorySafely(source, target) {
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      await fs.rename(source, target);
      return;
    }
    catch (error) {
      lastError = error;
      if (!isTransientFsError(error))
        throw error;
      try {
        await fs.cp(source, target, { recursive: true, force: true });
        await removePathWithRetry(source, { recursive: true, force: true });
        return;
      }
      catch (fallbackError) {
        lastError = fallbackError;
        if (await pathExists(target) && isTransientFsError(fallbackError)) {
          console.warn(`[cleanup-pending] copied target but could not remove locked source dir yet: ${source}`);
          return;
        }
        if (!isTransientFsError(fallbackError))
          throw fallbackError;
        await wait(150 * attempt * attempt);
      }
    }
  }
  throw lastError;
}

async function removePathWithRetry(target, options) {
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      await fs.rm(target, options);
      return;
    }
    catch (error) {
      lastError = error;
      if (!isTransientFsError(error))
        throw error;
      await wait(150 * attempt * attempt);
    }
  }
  throw lastError;
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
    .slice(0, 36);
  return cleaned || fallback;
}

function normalizeUsageKey(value, fallback = "") {
  return sanitizeToken(String(value ?? "").replace(/__v\d+$/i, ""), fallback);
}

function semanticBaseFromLabel(label, assetKind) {
  const state = stateSignatureFromLabel(label);
  const parts = [
    state.emotion,
    state.pose,
    state.eyes,
    state.gaze,
    state.mouth,
  ];
  for (const key of ["blush", "shadow", "tears", "wound", "sweat", "modifier"]) {
    const value = state[key] ?? "";
    if (value && value !== "none" && !parts.includes(value))
      parts.push(value);
  }
  if (assetKind === "character-avatar-chat" && !parts.includes("chat"))
    parts.push("chat");
  if (assetKind === "manga-avatar" && !parts.includes("manga"))
    parts.push("manga");
  return parts.join("_").replace(/_+/g, "_").slice(0, 96);
}

function isUncertainItem(item) {
  const haystack = [
    item.file,
    item.usageKey,
    item.versionedUsageKey,
    item.displayName,
  ].map(value => String(value ?? "").toLowerCase()).join("\n");
  return haystack.includes("uncertain_")
    || haystack.includes("待审")
    || haystack.includes("unknown_front_unknown")
    || haystack.includes("漫画头像 i");
}

function isRelabeledItem(item) {
  return String(item.namingSource ?? "").includes("vision-relabel");
}

function versionNumber(value) {
  const match = String(value ?? "").match(/__v(\d+)$/i);
  return match ? Number(match[1]) || 1 : 1;
}

function groupKeyForItem(item, existingGroupKeys) {
  const fileName = String(item.file ?? "");
  const fileStem = path.basename(fileName, path.extname(fileName));
  const candidates = [fileStem, item.interchangeableGroupId, item.versionedUsageKey]
    .map(value => String(value ?? "").trim())
    .filter(Boolean);
  for (const candidate of candidates) {
    if (existingGroupKeys.has(candidate))
      return candidate;
  }
  return candidates[0] ?? "";
}

function stateSignatureFromLabel(label) {
  const eyes = sanitizeToken(label.eyes, "unknown");
  let gaze = sanitizeToken(label.gaze, "unknown");
  if (eyes === "closed" && gaze === "unknown")
    gaze = "front";
  const state = {
    affect: sanitizeToken(label.affect ?? label.emotion, "uncertain"),
    blush: sanitizeToken(label.blush, "none"),
    emotion: sanitizeToken(label.emotion, "uncertain"),
    eyes,
    gaze,
    modifier: "",
    mouth: sanitizeToken(label.mouth, "unknown"),
    pose: sanitizeToken(label.pose, "front"),
    shadow: sanitizeToken(label.shadow, "none"),
    sweat: sanitizeToken(label.sweat, "none"),
    tears: sanitizeToken(label.tears, "none"),
    wound: sanitizeToken(label.wound, "none"),
  };
  state.modifier = normalizeModifier(label.modifier, state);
  return state;
}

function normalizeModifier(value, state) {
  const raw = sanitizeToken(value, "");
  if (!raw || raw === "none")
    return "";
  const aliases = new Map([
    ["laughing", "laugh"],
    ["laugh", "laugh"],
    ["drowsy", "tired"],
    ["smug", "smug"],
    ["awkward", "awkward"],
    ["startled", "startled"],
    ["speaking", "speaking"],
    ["menacing", "menacing"],
  ]);
  const normalized = aliases.get(raw) ?? raw;
  const redundant = new Set([
    "big_smile",
    "closed_eye",
    "closed_eyes",
    "closed_mouth",
    "eyes_closed",
    "front_gaze",
    "half_lidded_eyes",
    "open_eye",
    "open_eyes",
    "open_mouth",
    "side_gaze",
    "small_o_mouth",
    "smile",
    "tired_eyes",
    "wide_eyes",
    "wide_smile",
  ]);
  if (redundant.has(normalized))
    return "";
  if ([state.emotion, state.pose, state.eyes, state.gaze, state.mouth].includes(normalized))
    return "";
  return normalized;
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

async function imageToSheetDataUrl(items) {
  const cellW = 210;
  const imgH = 180;
  const labelH = 48;
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
    const label = Buffer.from(`<svg width="${cellW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f6f6f6"/><text x="6" y="18" font-family="Arial, sans-serif" font-size="13" fill="#111">${escapeXml(`${item.relabelId} ${item.role}`).slice(0, 32)}</text><text x="6" y="36" font-family="Arial, sans-serif" font-size="11" fill="#555">${escapeXml(item.file).slice(0, 36)}</text></svg>`);
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

async function callVision({ apiKey, args, batch, dataUrl, job }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  const prompt = [
    "你是用于安科文 replay 头像资源整理的视觉标注器。",
    "请只根据 contact sheet 中每个编号头像的可见表情/状态输出 JSON；不要合并，不要漏项。",
    "目标是把 uncertain 待审文件改成可读语义名，因此请尽量给出具体状态；只有确实看不清时才用 unknown/uncertain。",
    "使用小写英文受控词描述字段；中文 displayName 供人工审查。",
    "重点区分：脸红、阴影眼、受伤、流泪、汗、惊恐、嘴型、睁眼/闭眼/半睁、侧脸/歪头。",
    "如果是漫画头像，也只标注表情状态，不要描述剧情或人物身份。",
    `角色: ${job.role}`,
    `assetKind: ${job.assetKind}`,
    `编号: ${batch.map(item => item.relabelId).join(", ")}`,
    "返回格式：{\"items\":[{\"id\":\"R001\",\"displayName\":\"中文短名\",\"emotion\":\"neutral|happy|sad|angry|surprised|frightened|embarrassed|calm|sleepy|sly|worried|pain|uncertain\",\"pose\":\"front|tilted|side|profile|three_quarter|unknown\",\"eyes\":\"open|closed|half_lidded|wide|shadowed|unknown\",\"gaze\":\"front|side|down|up|unknown\",\"mouth\":\"closed|smile|open|small_o|grimace|pout|shout|unknown\",\"affect\":\"英文短状态\",\"blush\":\"none|light|strong\",\"shadow\":\"none|light|strong\",\"tears\":\"none|visible\",\"wound\":\"none|visible\",\"sweat\":\"none|visible\",\"modifier\":\"可选英文短词\",\"confidence\":0.0,\"notes\":\"可选\"}]}",
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
      console.warn(`[retry] ${params.job.role}/${params.job.assetKind} attempt=${attempt} ${error.message.slice(0, 160)} wait=${waitMs}`);
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

async function listJobs(args, finalRoot) {
  const namedRoot = path.join(finalRoot, "named-avatars");
  const jobs = [];
  for (const roleEntry of await fs.readdir(namedRoot, { withFileTypes: true })) {
    if (!roleEntry.isDirectory())
      continue;
    if (args.roles.size && !args.roles.has(roleEntry.name))
      continue;
    for (const kindEntry of await fs.readdir(path.join(namedRoot, roleEntry.name), { withFileTypes: true })) {
      if (!kindEntry.isDirectory())
        continue;
      if (args.assetKinds.size && !args.assetKinds.has(kindEntry.name))
        continue;
      const dir = path.join(namedRoot, roleEntry.name, kindEntry.name);
      const manifestPath = path.join(dir, "avatar-manifest.json");
      if (!await pathExists(manifestPath))
        continue;
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      const items = [];
      for (let index = 0; index < (manifest.items ?? []).length; index += 1) {
        const item = manifest.items[index];
        if (!isUncertainItem(item) && !(args.includeRelabeled && isRelabeledItem(item)))
          continue;
        const absPath = path.join(dir, item.file);
        if (!await pathExists(absPath))
          continue;
        const meta = await sharp(absPath, { failOn: "none" }).metadata();
        items.push({
          ...item,
          absPath,
          itemIndex: index,
          relabelId: `R${String(items.length + 1).padStart(3, "0")}`,
          role: roleEntry.name,
          width: meta.width ?? item.width,
          height: meta.height ?? item.height,
        });
        if (items.length >= args.limitItems)
          break;
      }
      if (items.length) {
        jobs.push({
          assetKind: kindEntry.name,
          dir,
          items,
          manifest,
          manifestPath,
          role: roleEntry.name,
        });
      }
      if (jobs.length >= args.limitJobs)
        return jobs;
    }
  }
  return jobs;
}

function initializeUsageCounts(manifest, targetIndexes) {
  const counts = new Map();
  for (let index = 0; index < (manifest.items ?? []).length; index += 1) {
    if (targetIndexes.has(index))
      continue;
    const item = manifest.items[index];
    const fileStem = path.basename(String(item.file ?? ""), path.extname(String(item.file ?? "")));
    const base = normalizeUsageKey(item.usageKey || item.versionedUsageKey || fileStem, "");
    if (!base)
      continue;
    const current = Math.max(
      versionNumber(item.versionedUsageKey),
      versionNumber(fileStem),
      counts.get(base) ?? 0,
    );
    counts.set(base, current);
  }
  return counts;
}

function buildCsvRows(manifest) {
  return (manifest.items ?? []).map(item => ({
    assetKind: item.assetKind,
    blush: item.blush,
    collapseReason: item.collapseReason,
    confidence: item.confidence,
    displayName: item.displayName,
    emotion: item.emotion,
    eyes: item.eyes,
    file: item.file,
    memberCount: item.memberCount,
    mouth: item.mouth,
    notes: item.notes,
    representativeId: item.representativeId,
    representativeOriginalFile: item.representativeOriginalFile,
    representativeSourceRelPath: item.representativeSourceRelPath,
    reviewStatus: item.reviewStatus,
    shadow: item.shadow,
    sourceCandidateCount: item.sourceCandidateCount,
    usageKey: item.usageKey,
    versionedUsageKey: item.versionedUsageKey,
  }));
}

async function writeManifestCsv(dir, manifest) {
  const columns = [
    "file",
    "usageKey",
    "versionedUsageKey",
    "displayName",
    "assetKind",
    "representativeId",
    "representativeOriginalFile",
    "representativeSourceRelPath",
    "memberCount",
    "sourceCandidateCount",
    "emotion",
    "eyes",
    "mouth",
    "blush",
    "shadow",
    "reviewStatus",
    "confidence",
    "collapseReason",
    "notes",
  ];
  await fs.writeFile(path.join(dir, "avatar-manifest.csv"), `${toCsv(buildCsvRows(manifest), columns)}\n`, "utf8");
}

async function updateSummary(finalRoot) {
  const namedRoot = path.join(finalRoot, "named-avatars");
  const summaryPath = path.join(finalRoot, "summary.json");
  const summary = JSON.parse(await fs.readFile(summaryPath, "utf8"));
  const namedAvatars = {};
  let roleCount = 0;
  let kindCount = 0;
  let sourceCount = 0;
  let namedCount = 0;
  let hiddenAltCount = 0;
  let sourceCandidateCount = 0;
  for (const roleEntry of await fs.readdir(namedRoot, { withFileTypes: true })) {
    if (!roleEntry.isDirectory())
      continue;
    const roleSummary = {};
    for (const kindEntry of await fs.readdir(path.join(namedRoot, roleEntry.name), { withFileTypes: true })) {
      if (!kindEntry.isDirectory())
        continue;
      const dir = path.join(namedRoot, roleEntry.name, kindEntry.name);
      const manifestPath = path.join(dir, "avatar-manifest.json");
      if (!await pathExists(manifestPath))
        continue;
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      const named = manifest.items.length;
      const source = manifest.items.reduce((sum, item) => sum + (Number(item.memberCount) || 1), 0);
      const hidden = source - named;
      const sourceCandidates = manifest.items.reduce((sum, item) => sum + (Number(item.sourceCandidateCount) || 0), 0);
      const groupRoot = path.join(dir, "_interchangeable");
      const groups = await pathExists(groupRoot)
        ? (await fs.readdir(groupRoot, { withFileTypes: true })).filter(entry => entry.isDirectory()).length
        : 0;
      roleSummary[kindEntry.name] = {
        hiddenAltCount: hidden,
        interchangeableGroups: groups,
        namedCount: named,
        outputDir: dir.replaceAll("\\", "/"),
        sourceCandidateCount: sourceCandidates,
        sourceCount: source,
      };
      kindCount += 1;
      sourceCount += source;
      namedCount += named;
      hiddenAltCount += hidden;
      sourceCandidateCount += sourceCandidates;
    }
    if (Object.keys(roleSummary).length) {
      namedAvatars[roleEntry.name] = roleSummary;
      roleCount += 1;
    }
  }
  summary.namedAvatars = namedAvatars;
  summary.namedAvatarsTotals = { roleCount, kindCount, sourceCount, namedCount, hiddenAltCount, sourceCandidateCount };
  summary.namedAvatarsUpdatedAt = new Date().toISOString();
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

async function applyRelabels({ args, job, proposals, reportDir, runId }) {
  const existingGroupKeys = await pathExists(path.join(job.dir, "_interchangeable"))
    ? new Set((await fs.readdir(path.join(job.dir, "_interchangeable"), { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name))
    : new Set();
  const targetIndexes = new Set(proposals.map(proposal => proposal.item.itemIndex));
  const usageCounts = initializeUsageCounts(job.manifest, targetIndexes);
  const backupDir = path.join(reportDir, `before-relabel-${runId}`);
  await fs.cp(job.dir, backupDir, { recursive: true });

  const applied = [];
  for (const proposal of proposals) {
    const item = job.manifest.items[proposal.item.itemIndex];
    const label = proposal.label;
    const base = semanticBaseFromLabel(label, job.assetKind);
    const next = (usageCounts.get(base) ?? 0) + 1;
    usageCounts.set(base, next);
    const versionedUsageKey = `${base}__v${String(next).padStart(3, "0")}`;
    const nextFile = `${versionedUsageKey}.png`;
    const previousFile = item.file;
    const previousGroupKey = groupKeyForItem(item, existingGroupKeys);
    const previousGroupDir = path.join(job.dir, "_interchangeable", previousGroupKey);
    const nextGroupDir = path.join(job.dir, "_interchangeable", versionedUsageKey);
    const previousFilePath = path.join(job.dir, previousFile);
    const nextFilePath = path.join(job.dir, nextFile);
    if (previousFile !== nextFile)
      await moveFileSafely(previousFilePath, nextFilePath);
    if (previousGroupKey && previousGroupKey !== versionedUsageKey && await pathExists(previousGroupDir))
      await moveDirectorySafely(previousGroupDir, nextGroupDir);
    const stateSignature = stateSignatureFromLabel(label);
    Object.assign(item, {
      ...stateSignature,
      confidence: Number(label.confidence) || 0,
      displayName: String(label.displayName ?? "").trim() || item.displayName,
      file: nextFile,
      interchangeableGroupId: versionedUsageKey,
      namingSource: `${args.model}:vision-relabel-${runId}`,
      notes: String(label.notes ?? "").trim(),
      previousFile,
      previousUsageKey: item.usageKey,
      relabeledAt: new Date().toISOString(),
      reviewStatus: Number(label.confidence) >= 0.75 ? "ai-labeled" : "needs-human-review",
      usageKey: base,
      versionedUsageKey,
    });
    for (const member of item.members ?? []) {
      member.stateSignature = stateSignature;
      member.collapsedInto = nextFile;
    }
    await fs.writeFile(path.join(nextGroupDir, "group.json"), `${JSON.stringify(item, null, 2)}\n`, "utf8");
    applied.push({
      confidence: item.confidence,
      displayName: item.displayName,
      nextFile,
      previousFile,
      role: job.role,
      usageKey: base,
    });
  }
  job.manifest.relabelRunId = runId;
  job.manifest.relabelModel = args.model;
  job.manifest.relabelUpdatedAt = new Date().toISOString();
  await fs.writeFile(job.manifestPath, `${JSON.stringify(job.manifest, null, 2)}\n`, "utf8");
  await writeManifestCsv(job.dir, job.manifest);
  return applied;
}

async function processJob({ apiKey, args, job, reportRoot, runId }) {
  const reportDir = path.join(reportRoot, job.role, job.assetKind);
  await fs.mkdir(reportDir, { recursive: true });
  if (args.dryRun) {
    return { assetKind: job.assetKind, dryRun: true, role: job.role, targetCount: job.items.length };
  }

  const labelsById = new Map();
  const batches = [];
  for (let index = 0; index < job.items.length; index += args.batchSize)
    batches.push(job.items.slice(index, index + args.batchSize));
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const sheet = await imageToSheetDataUrl(batch);
    await fs.writeFile(path.join(reportDir, `batch-${String(batchIndex + 1).padStart(3, "0")}.png`), sheet.png);
    let payload;
    let errorText = "";
    try {
      payload = await callVisionWithRetry({ apiKey, args, batch, dataUrl: sheet.dataUrl, job });
    }
    catch (error) {
      errorText = String(error?.message ?? error);
      if (!args.allowFallback)
        throw error;
      console.warn(`[fallback] ${job.role}/${job.assetKind}/batch-${batchIndex + 1}: ${errorText.slice(0, 240)}`);
      payload = { items: [] };
    }
    const labels = Array.isArray(payload?.items) ? payload.items : [];
    for (const label of labels) {
      const id = String(label.id ?? "").trim();
      if (id)
        labelsById.set(id, label);
    }
    await fs.writeFile(path.join(reportDir, `batch-${String(batchIndex + 1).padStart(3, "0")}.labels.json`), `${JSON.stringify({
      error: errorText,
      ids: batch.map(item => item.relabelId),
      labels: batch.map(item => labelsById.get(item.relabelId) ?? null),
      model: args.model,
    }, null, 2)}\n`, "utf8");
  }

  const proposals = [];
  const skipped = [];
  for (const item of job.items) {
    const label = labelsById.get(item.relabelId);
    if (!label) {
      skipped.push({ file: item.file, reason: "missing-label", relabelId: item.relabelId });
      continue;
    }
    const confidence = Number(label.confidence) || 0;
    if (confidence < args.minConfidence) {
      skipped.push({ confidence, file: item.file, reason: "below-min-confidence", relabelId: item.relabelId });
      continue;
    }
    proposals.push({ item, label: { ...label, confidence } });
  }

  await fs.writeFile(path.join(reportDir, "relabel-proposals.json"), `${JSON.stringify({
    apply: args.apply,
    generatedAt: new Date().toISOString(),
    proposals: proposals.map(proposal => ({
      confidence: proposal.label.confidence,
      displayName: proposal.label.displayName,
      fromFile: proposal.item.file,
      relabelId: proposal.item.relabelId,
      state: stateSignatureFromLabel(proposal.label),
      toUsageKey: semanticBaseFromLabel(proposal.label, job.assetKind),
    })),
    skipped,
  }, null, 2)}\n`, "utf8");

  const applied = args.apply
    ? await applyRelabels({ args, job, proposals, reportDir, runId })
    : [];
  return {
    appliedCount: applied.length,
    assetKind: job.assetKind,
    proposalCount: proposals.length,
    role: job.role,
    skippedCount: skipped.length,
    targetCount: job.items.length,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!args.dryRun && !apiKey)
    throw new Error("OPENAI_API_KEY 未设置");
  const finalRoot = path.join(args.root, "image-role-review-clean-vision-final");
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const reportRoot = path.join(finalRoot, "reports", "named-avatar-vision-relabel", runId);
  await fs.mkdir(reportRoot, { recursive: true });
  const jobs = await listJobs(args, finalRoot);
  await fs.writeFile(path.join(reportRoot, "job-inventory.json"), `${JSON.stringify({
    apply: args.apply,
    count: jobs.length,
    generatedAt: new Date().toISOString(),
    jobs: jobs.map(job => ({ assetKind: job.assetKind, count: job.items.length, role: job.role })),
    model: args.model,
  }, null, 2)}\n`, "utf8");
  console.log(`[relabel] jobs=${jobs.length} items=${jobs.reduce((sum, job) => sum + job.items.length, 0)} apply=${args.apply} dryRun=${args.dryRun} report=${reportRoot}`);
  const results = [];
  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    console.log(`[job ${index + 1}/${jobs.length}] ${job.role}/${job.assetKind} uncertain=${job.items.length}`);
    results.push(await processJob({ apiKey, args, job, reportRoot, runId }));
  }
  await fs.writeFile(path.join(reportRoot, "run-summary.json"), `${JSON.stringify({
    apply: args.apply,
    generatedAt: new Date().toISOString(),
    results,
  }, null, 2)}\n`, "utf8");
  if (args.apply)
    await updateSummary(finalRoot);
  console.log(`[relabel] completed=${results.length} proposals=${results.reduce((sum, result) => sum + (result.proposalCount ?? 0), 0)} applied=${results.reduce((sum, result) => sum + (result.appliedCount ?? 0), 0)} skipped=${results.reduce((sum, result) => sum + (result.skippedCount ?? 0), 0)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
