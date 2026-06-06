#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const DEFAULT_ROOT = "D:\\gululu-cache\\output\\opus-88-owner-only-refetch-v3";
const DEFAULT_BASE_URL = "https://apifree.this52.cn/v1";
const DEFAULT_MODEL = "gpt-5.5";
const ASSET_KINDS = new Set([
  "character-sprite",
  "character-avatar-bust",
  "character-avatar-chat",
  "manga-avatar",
  "manga-panel",
  "background",
  "reference-only",
  "author-asset",
  "excluded",
  "unknown",
]);
const RENDER_USES = new Set(["stage", "chat-avatar", "background", "reference", "none"]);

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
  const root = path.resolve(args.get("root") ?? DEFAULT_ROOT);
  return {
    baseUrl: (args.get("base-url") ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
    concurrency: Math.max(1, Math.min(16, Number(args.get("concurrency") ?? 1) || 1)),
    delayMs: Number(args.get("delay-ms") ?? 900),
    force: args.has("force"),
    imageDetail: args.get("image-detail") ?? "low",
    limit: args.has("limit") ? Number(args.get("limit")) : Number.POSITIVE_INFINITY,
    maxImagesPerGroup: Number(args.get("max-images-per-group") ?? 3),
    model: args.get("model") ?? DEFAULT_MODEL,
    reviewDir: path.resolve(args.get("review-dir") ?? path.join(root, "cleaning-review-ai-first-v1")),
    root,
    timeoutMs: Number(args.get("timeout-ms") ?? 120000),
  };
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
    if (char === "\"") {
      if (quoted && text[index + 1] === "\"") {
        cell += "\"";
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
  const [headers, ...body] = rows;
  if (!headers) return [];
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function readCsv(file) {
  return parseCsv(await fs.readFile(file, "utf8"));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function readJsonl(file) {
  const text = await fs.readFile(file, "utf8");
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function splitPipe(value) {
  return String(value ?? "").split("|").map((item) => item.trim()).filter(Boolean);
}

function boolValue(value) {
  return /^(?:1|true|yes|y|是)$/i.test(String(value ?? ""));
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

function normalizeReviewStatus(value, confidence) {
  const text = String(value ?? "").trim();
  if (["ai-confirmed", "needs-human-review", "rejected"].includes(text)) return text;
  return confidence >= 0.84 ? "ai-confirmed" : "needs-human-review";
}

function enforceDecisionRules(decision) {
  const assetKind = ASSET_KINDS.has(decision.assetKind) ? decision.assetKind : "unknown";
  const renderUse = RENDER_USES.has(decision.renderUse) ? decision.renderUse : "none";
  const confidence = clampConfidence(decision.confidence);
  const manga = assetKind === "manga-avatar" || assetKind === "manga-panel" || Boolean(decision.manga);
  const mattingAllowed = manga
    ? false
    : Boolean(decision.mattingAllowed) && ["character-sprite", "character-avatar-bust"].includes(assetKind) && renderUse === "stage";
  return {
    assetKind,
    candidateRoleName: String(decision.candidateRoleName ?? "").trim(),
    confidence,
    conflictReason: String(decision.conflictReason ?? "").trim(),
    evidenceSummary: String(decision.evidenceSummary ?? "").trim(),
    locationName: String(decision.locationName ?? "").trim(),
    manga,
    mattingAllowed,
    needsMatting: mattingAllowed && Boolean(decision.needsMatting),
    renderUse,
    reviewStatus: normalizeReviewStatus(decision.reviewStatus, confidence),
    tags: Array.isArray(decision.tags) ? decision.tags.map(String).slice(0, 12) : [],
    visualGroupId: String(decision.visualGroupId ?? "").trim(),
  };
}

function extractJsonObject(text) {
  const raw = String(text ?? "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced);
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error(`无法解析 JSON: ${raw.slice(0, 200)}`);
  }
}

async function sleep(ms) {
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

async function imageToDataUrl(absPath) {
  const buffer = await sharp(absPath, { failOn: "none" })
    .rotate()
    .resize(768, 768, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

function chooseRepresentativePaths(group) {
  const members = splitPipe(group.memberSourceRelPaths);
  const selected = [];
  if (group.canonicalRelPath) selected.push(group.canonicalRelPath);
  for (const member of members) {
    if (!selected.includes(member)) selected.push(member);
  }
  return selected;
}

function groupContext(group, evidenceBySource, roleByGroup, typeLabelsBySource) {
  const memberSourceRelPaths = splitPipe(group.memberSourceRelPaths);
  const packs = memberSourceRelPaths.map((relPath) => evidenceBySource.get(relPath)).filter(Boolean);
  const typeCounts = {};
  for (const relPath of memberSourceRelPaths) {
    const type = typeLabelsBySource.get(relPath)?.assetKind ?? "";
    if (type) typeCounts[type] = (typeCounts[type] ?? 0) + 1;
  }
  const contexts = packs.slice(0, 8).map((pack) => ({
    after: pack.contextAfter,
    before: pack.contextBefore,
    floors: pack.allFloors,
    nearbySpeakers: pack.nearbySpeakers,
    sceneLabel: pack.sceneLabel,
    sourceRelPath: pack.sourceRelPath,
  }));
  const role = roleByGroup.get(group.visualGroupId) ?? {};
  return {
    aggregatedScenes: group.aggregatedScenes,
    aggregatedSpeakers: group.aggregatedSpeakers,
    currentAssetKindSummary: typeCounts,
    currentCandidateRole: role.candidateRoleName ?? "",
    currentRenderUse: role.renderUse ?? "",
    currentReviewStatus: role.reviewStatus ?? "",
    groupRelationType: group.groupRelationType,
    memberCount: memberSourceRelPaths.length,
    sourceRelPaths: memberSourceRelPaths.slice(0, 20),
    textContexts: contexts,
    visualGroupId: group.visualGroupId,
  };
}

function systemPrompt() {
  return [
    "你是咕噜噜安科文导入 Replay 的图片清洗视觉审查器。",
    "你必须严格输出 JSON 对象，不要 Markdown，不要解释。",
    "目标是减少人类参与，但低置信必须标记 needs-human-review。",
    "漫画图，包括漫画头像和漫画分镜，永远不能抠图。",
    "manga-avatar 不是“动漫/漫画画风头像”，而是黑白灰/低彩度漫画媒介中的角色头部裁切。",
    "高彩度彩色角色头像禁止标记为 manga-avatar，应标记为 character-avatar-bust 或 character-avatar-chat。",
    "非漫画彩色头像/立绘如有差分，不要建议合并为同一张；本任务只判断用途和角色候选。",
    "路径名和旧分类只能作为弱证据，画面和上下文优先。",
    "assetKind 只能是 character-sprite, character-avatar-bust, character-avatar-chat, manga-avatar, manga-panel, background, reference-only, author-asset, excluded, unknown。",
    "renderUse 只能是 stage, chat-avatar, background, reference, none。",
    "reviewStatus 只能是 ai-confirmed, needs-human-review, rejected。",
    "输出 schema: {visualGroupId, assetKind, renderUse, candidateRoleName, locationName, manga, mattingAllowed, needsMatting, confidence, evidenceSummary, conflictReason, reviewStatus, tags}",
  ].join("\n");
}

function userTextPayload(context) {
  return [
    "请根据图片和证据判断这个视觉组的最终用途。",
    "只有黑白灰/低彩度漫画媒介中的角色头部且可代表单角色时，assetKind=manga-avatar, renderUse=chat-avatar, mattingAllowed=false。",
    "如果是漫画分镜/战斗画面/大幅剧情参考，assetKind=manga-panel 或 reference-only, renderUse=reference。",
    "如果是单角色彩色胸像/头像，按 character-avatar-bust 或 character-avatar-chat。",
    "如果是可上舞台的非漫画角色立绘/半身且白底或透明底，renderUse=stage，可按条件 needsMatting=true。",
    "如果是纯场景，assetKind=background。",
    "证据如下：",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

async function callVision({ apiKey, args, content }) {
  const body = {
    messages: [
      { content: systemPrompt(), role: "system" },
      { content, role: "user" },
    ],
    model: args.model,
    temperature: 0,
  };
  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
    try {
      const response = await fetch(`${args.baseUrl}/chat/completions`, {
        body: JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const text = await response.text();
      if (response.ok) {
        const data = JSON.parse(text);
        return data.choices?.[0]?.message?.content ?? "";
      }
      lastError = new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
      if (![408, 409, 425, 429, 500, 502, 503, 504].includes(response.status)) {
        throw lastError;
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : Math.min(60000, 2000 * 2 ** attempt));
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      await sleep(Math.min(60000, 2000 * 2 ** attempt));
    }
  }
  throw lastError ?? new Error("vision request failed");
}

async function loadCache(cachePath) {
  if (!(await pathExists(cachePath))) return new Map();
  const rows = await readJsonl(cachePath);
  const cache = new Map();
  for (const row of rows) {
    if (row.visualGroupId) cache.set(row.visualGroupId, row);
  }
  return cache;
}

function isReusableCachedDecision(cached, args) {
  if (!cached) return false;
  if (cached.error) return false;
  return cached.model === args.model;
}

function isQuotaOrAuthError(error) {
  return /usage_limit_reached|auth_unavailable|invalidated oauth token/i.test(String(error?.message ?? error));
}

async function writeCache(cachePath, cache) {
  const rows = [...cache.values()].sort((left, right) => left.visualGroupId.localeCompare(right.visualGroupId));
  await fs.writeFile(cachePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

async function reviewGroup({ apiKey, args, evidenceBySource, group, roleByGroup, typeLabelsBySource }) {
  const context = groupContext(group, evidenceBySource, roleByGroup, typeLabelsBySource);
  const content = [{ text: userTextPayload(context), type: "text" }];
  const chosenPaths = chooseRepresentativePaths(group).slice(0, args.maxImagesPerGroup);
  for (const relPath of chosenPaths) {
    const absPath = path.join(args.root, "images", relPath);
    try {
      content.push({
        image_url: {
          detail: args.imageDetail,
          url: await imageToDataUrl(absPath),
        },
        type: "image_url",
      });
    } catch (error) {
      context.imageReadErrors ??= [];
      context.imageReadErrors.push({ error: error.message, sourceRelPath: relPath });
    }
  }
  if (content.length === 1) {
    return {
      ...enforceDecisionRules({
        assetKind: "unknown",
        confidence: 0.05,
        conflictReason: "视觉组所有代表图都无法读取",
        evidenceSummary: "图片无法读取，无法视觉确认",
        renderUse: "none",
        reviewStatus: "needs-human-review",
        visualGroupId: group.visualGroupId,
      }),
      rawResponse: "",
    };
  }
  const rawResponse = await callVision({ apiKey, args, content });
  const parsed = extractJsonObject(rawResponse);
  return {
    ...enforceDecisionRules({
      ...parsed,
      visualGroupId: group.visualGroupId,
    }),
    rawResponse,
  };
}

function applyVisionToTypeLabels(typeRows, groupBySource, decisionByGroup) {
  return typeRows.map((row) => {
    const group = groupBySource.get(row.sourceRelPath);
    const decision = decisionByGroup.get(group?.visualGroupId);
    if (!decision) return row;
    return {
      ...row,
      assetKind: decision.assetKind,
      confidence: decision.confidence,
      evidenceSummary: decision.evidenceSummary,
      llmTypeLabel: decision.assetKind,
      renderUse: decision.renderUse,
      reviewRunId: "vision-review-this52-v1",
      reviewStatus: decision.reviewStatus,
    };
  });
}

function applyVisionToRoleRows(groups, decisionByGroup) {
  return groups.map((group) => {
    const decision = decisionByGroup.get(group.visualGroupId);
    return {
      assetKind: decision?.assetKind ?? "unknown",
      candidateRoleName: decision?.candidateRoleName ?? "",
      confidence: decision?.confidence ?? 0,
      conflictReason: decision?.conflictReason ?? "missing vision decision",
      evidencePackIds: group.memberEvidencePackIds,
      locationName: decision?.locationName ?? "",
      pathEvidence: "",
      renderUse: decision?.renderUse ?? "none",
      reviewRunId: "vision-review-this52-v1",
      reviewStatus: decision?.reviewStatus ?? "needs-human-review",
      speakerEvidence: group.aggregatedSpeakers,
      visualEvidence: decision?.evidenceSummary ?? "",
      visualGroupId: group.visualGroupId,
    };
  });
}

function applyVisionToImageDecisions(rows, groupBySource, decisionByGroup) {
  return rows.map((row) => {
    const group = groupBySource.get(row.sourceRelPath);
    const decision = decisionByGroup.get(group?.visualGroupId);
    if (!decision) return row;
    const roleConfirmed = decision.reviewStatus === "ai-confirmed" && decision.candidateRoleName;
    const oldTransparentRejected = row.mattingStatus === "rejected" || /旧/.test(row.notes ?? "");
    return {
      ...row,
      aiReviewRunIds: [row.aiReviewRunIds, "vision-review-this52-v1"].filter(Boolean).join("|"),
      assetKind: decision.assetKind,
      candidateRoleName: decision.candidateRoleName,
      character: roleConfirmed ? decision.candidateRoleName : "",
      confidence: decision.confidence,
      decisionStatus: decision.reviewStatus === "ai-confirmed" ? "ai-confirmed" : "needs-human-review",
      evidenceSummary: decision.evidenceSummary,
      mattingAllowed: decision.mattingAllowed,
      mattingStatus: decision.mattingAllowed
        ? decision.needsMatting ? "pending" : "not-needed"
        : oldTransparentRejected ? "rejected" : "not-needed",
      needsMatting: decision.needsMatting,
      notes: oldTransparentRejected && !decision.mattingAllowed ? "旧透明图存在，但视觉门禁拒绝消费" : row.notes,
      renderUse: decision.renderUse,
      roleConfidence: decision.candidateRoleName ? decision.confidence : "",
      visualStatus: decision.reviewStatus,
    };
  });
}

function buildMattingRows(imageRows) {
  return imageRows.map((row) => ({
    alphaMaskRelPath: "",
    assetKind: row.assetKind,
    mattingAllowed: row.mattingAllowed,
    mattingModel: "",
    mattingStatus: row.mattingStatus,
    needsMatting: row.needsMatting,
    qaReason: boolValue(row.mattingAllowed) ? "视觉门禁允许，待 QA" : "视觉门禁不允许抠图",
    qaStatus: boolValue(row.mattingAllowed) && boolValue(row.needsMatting) ? "pending" : "not-required",
    renderUse: row.renderUse,
    sha256: row.sha256,
    sourceRelPath: row.sourceRelPath,
    transparentRelPath: "",
  }));
}

function buildAnomalies(imageRows, decisionByGroup, groupBySource) {
  const anomalies = [];
  const seenGroup = new Set();
  for (const row of imageRows) {
    const group = groupBySource.get(row.sourceRelPath);
    const decision = decisionByGroup.get(group?.visualGroupId);
    if (decision && !seenGroup.has(decision.visualGroupId) && decision.reviewStatus !== "ai-confirmed") {
      seenGroup.add(decision.visualGroupId);
      anomalies.push({
        anomalyId: `vision-anom-${String(anomalies.length + 1).padStart(5, "0")}`,
        anomalyKind: decision.assetKind === "unknown" ? "low-confidence-type" : "role-conflict",
        candidateRoleNames: decision.candidateRoleName,
        confidence: decision.confidence,
        conflictReason: decision.conflictReason || "视觉模型未达到自动确认阈值",
        evidencePackIds: group.memberEvidencePackIds,
        notes: "",
        resolutionRef: "",
        reviewStatus: "queued",
        severity: decision.assetKind === "unknown" ? "warning" : "info",
        sourceRelPaths: group.memberSourceRelPaths,
        suggestedAction: "人工终验或二次视觉复核",
        visualGroupId: decision.visualGroupId,
      });
    }
    if (!boolValue(row.mattingAllowed) && row.mattingStatus === "rejected") {
      anomalies.push({
        anomalyId: `vision-anom-${String(anomalies.length + 1).padStart(5, "0")}`,
        anomalyKind: "matting-gate-violation",
        candidateRoleNames: row.candidateRoleName,
        confidence: row.confidence,
        conflictReason: "旧 clean 目录存在透明图，但视觉流程 mattingAllowed=false",
        evidencePackIds: row.evidencePackId,
        notes: "",
        resolutionRef: "",
        reviewStatus: "queued",
        severity: "blocker",
        sourceRelPaths: row.sourceRelPath,
        suggestedAction: "作废旧透明图，按 vision matting-decisions 重建 clean 目录",
        visualGroupId: row.visualGroupId,
      });
    }
  }
  return anomalies;
}

async function writeCsv(file, rows, columns) {
  await fs.writeFile(file, `${toCsv(rows, columns)}\n`, "utf8");
}

async function writeJson(file, data) {
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writeVisionHtml(reviewDir, summary, decisions, anomalies) {
  const typeCounts = summary.review.typeCounts;
  const topRows = decisions
    .filter((row) => row.candidateRoleName)
    .reduce((map, row) => map.set(row.candidateRoleName, (map.get(row.candidateRoleName) ?? 0) + 1), new Map());
  const html = `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>Gululu AI-first Vision Review</title>
<style>
body{font-family:system-ui,"Microsoft YaHei",sans-serif;margin:0;background:#f6f7f4;color:#1f2933}
main{max-width:1180px;margin:0 auto;padding:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.metric,table{background:#fff;border:1px solid #ddd;border-radius:6px}
.metric{padding:12px}.metric b{display:block;font-size:22px}
table{border-collapse:collapse;width:100%;border-radius:0}th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px;text-align:left}
th{background:#e9ecef}
a{color:#0f766e}
</style>
<main>
<h1>Gululu AI-first Vision Review</h1>
<p>视觉接口结果已写入 <code>*.vision.*</code> 文件，原始程序产物保留。</p>
<section class="grid">
${[
    ["视觉组", summary.vision.groups],
    ["已处理", summary.vision.processed],
    ["缓存命中", summary.vision.cacheHits],
    ["本轮调用", summary.vision.apiCalls],
    ["异常", summary.review.anomalies],
    ["图片", summary.images.totalFiles],
  ].map(([label, value]) => `<div class="metric"><span>${label}</span><b>${value}</b></div>`).join("")}
</section>
<h2>类型分布</h2>
<table><tr><th>assetKind</th><th>count</th></tr>${Object.entries(typeCounts).map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`).join("")}</table>
<h2>角色 Top 20</h2>
<table><tr><th>role</th><th>groups</th></tr>${[...topRows.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([role, count]) => `<tr><td>${role}</td><td>${count}</td></tr>`).join("")}</table>
<h2>异常样例</h2>
<table><tr><th>kind</th><th>severity</th><th>reason</th><th>paths</th></tr>${anomalies.slice(0, 80).map((row) => `<tr><td>${row.anomalyKind}</td><td>${row.severity}</td><td>${row.conflictReason}</td><td>${row.sourceRelPaths}</td></tr>`).join("")}</table>
<h2>关键文件</h2>
<ul>
${["summary.vision.json", "vision-group-decisions.csv", "image-type-labels.vision.csv", "role-classification-candidates.vision.csv", "image-decisions.vision.csv", "matting-decisions.vision.csv", "anomaly-queue.vision.csv"].map((file) => `<li><a href="${file}">${file}</a></li>`).join("")}
</ul>
</main>`;
  await fs.writeFile(path.join(reviewDir, "review-vision.html"), html, "utf8");
}

async function main() {
  const startedAt = new Date().toISOString();
  const args = parseArgs(process.argv);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 未设置");
  }
  const cachePath = path.join(args.reviewDir, "cache", "vision-group-decisions.jsonl");
  await fs.mkdir(path.dirname(cachePath), { recursive: true });

  const evidencePacks = await readJsonl(path.join(args.reviewDir, "image-evidence-packs.jsonl"));
  const evidenceBySource = new Map(evidencePacks.map((pack) => [pack.sourceRelPath, pack]));
  const groups = await readCsv(path.join(args.reviewDir, "image-visual-groups.csv"));
  const typeRows = await readCsv(path.join(args.reviewDir, "image-type-labels.csv"));
  const typeLabelsBySource = new Map(typeRows.map((row) => [row.sourceRelPath, row]));
  const roleRows = await readCsv(path.join(args.reviewDir, "role-classification-candidates.csv"));
  const roleByGroup = new Map(roleRows.map((row) => [row.visualGroupId, row]));
  const imageRows = await readCsv(path.join(args.reviewDir, "image-decisions.csv"));
  const summary = await readJson(path.join(args.reviewDir, "summary.json"));
  const groupBySource = new Map();
  for (const group of groups) {
    for (const relPath of splitPipe(group.memberSourceRelPaths)) {
      groupBySource.set(relPath, group);
    }
  }

  const cache = await loadCache(cachePath);
  let apiCalls = 0;
  let cacheHits = 0;
  let nextPendingIndex = 0;
  let writeQueue = Promise.resolve();
  let stopRequested = false;
  const targetGroups = groups.slice(0, Number.isFinite(args.limit) ? args.limit : groups.length);
  const pendingGroups = [];
  const failedCachedGroups = [];

  for (const [index, group] of targetGroups.entries()) {
    const cached = cache.get(group.visualGroupId);
    if (!args.force && isReusableCachedDecision(cached, args)) {
      cacheHits += 1;
      continue;
    }
    if (cached?.error) {
      failedCachedGroups.push({ group, index });
    } else {
      pendingGroups.push({ group, index });
    }
  }
  pendingGroups.push(...failedCachedGroups);

  function persistCache() {
    writeQueue = writeQueue.then(() => writeCache(cachePath, cache));
    return writeQueue;
  }

  async function runWorker(workerIndex) {
    while (!stopRequested && nextPendingIndex < pendingGroups.length) {
      const { group, index } = pendingGroups[nextPendingIndex];
      nextPendingIndex += 1;
      console.log(`vision ${index + 1}/${targetGroups.length} ${group.visualGroupId} worker=${workerIndex}`);
      try {
        const decision = await reviewGroup({ apiKey, args, evidenceBySource, group, roleByGroup, typeLabelsBySource });
        cache.set(group.visualGroupId, {
          ...decision,
          model: args.model,
          reviewedAt: new Date().toISOString(),
          reviewRunId: "vision-review-this52-v1",
        });
        apiCalls += 1;
        await persistCache();
        await sleep(args.delayMs);
      } catch (error) {
        cache.set(group.visualGroupId, {
          ...enforceDecisionRules({
            assetKind: "unknown",
            confidence: 0,
            conflictReason: error.message,
            evidenceSummary: "视觉接口调用失败",
            renderUse: "none",
            reviewStatus: "needs-human-review",
            visualGroupId: group.visualGroupId,
          }),
          error: error.message,
          model: args.model,
          reviewedAt: new Date().toISOString(),
          reviewRunId: "vision-review-this52-v1",
        });
        if (isQuotaOrAuthError(error)) {
          stopRequested = true;
        }
        await persistCache();
        await sleep(Math.max(args.delayMs, 3000));
      }
    }
  }

  const workerCount = Math.min(args.concurrency, pendingGroups.length);
  await Promise.all(Array.from({ length: workerCount }, (_, index) => runWorker(index + 1)));
  await writeQueue;

  const currentModelGroups = groups.filter((group) => cache.get(group.visualGroupId)?.model === args.model);
  const completedGroups = groups.filter((group) => isReusableCachedDecision(cache.get(group.visualGroupId), args));
  const errorGroups = currentModelGroups.filter((group) => cache.get(group.visualGroupId)?.error);
  const decisionByGroup = new Map([...cache.values()]
    .filter((row) => isReusableCachedDecision(row, args))
    .map((row) => [row.visualGroupId, enforceDecisionRules(row)]));
  const visionRows = groups.map((group) => ({
    ...decisionByGroup.get(group.visualGroupId),
    memberSourceRelPaths: group.memberSourceRelPaths,
    reviewedBy: "vision-api",
    reviewRunId: "vision-review-this52-v1",
  }));
  const updatedTypeRows = applyVisionToTypeLabels(typeRows, groupBySource, decisionByGroup);
  const updatedRoleRows = applyVisionToRoleRows(groups, decisionByGroup);
  const updatedImageRows = applyVisionToImageDecisions(imageRows, groupBySource, decisionByGroup);
  const updatedMattingRows = buildMattingRows(updatedImageRows);
  const anomalyRows = buildAnomalies(updatedImageRows, decisionByGroup, groupBySource);
  const typeCounts = updatedTypeRows.reduce((counts, row) => {
    counts[row.assetKind] = (counts[row.assetKind] ?? 0) + 1;
    return counts;
  }, {});
  const visionSummary = {
    ...summary,
    generatedAt: new Date().toISOString(),
    review: {
      ...summary.review,
      anomalies: anomalyRows.length,
      typeCounts,
    },
    vision: {
      apiCalls,
      baseUrl: args.baseUrl,
      cacheHits,
      concurrency: args.concurrency,
      errors: errorGroups.length,
      groups: groups.length,
      model: args.model,
      processed: completedGroups.length,
      startedAt,
      status: completedGroups.length >= groups.length ? "complete" : stopRequested ? "stopped-quota" : "partial",
    },
  };
  const visionRun = {
    errorSummary: "",
    finishedAt: visionSummary.generatedAt,
    inputRefs: ["image-visual-groups.csv", "image-evidence-packs.jsonl"],
    model: args.model,
    outputRefs: [
      "vision-group-decisions.csv",
      "image-type-labels.vision.csv",
      "role-classification-candidates.vision.csv",
      "image-decisions.vision.csv",
      "anomaly-queue.vision.csv",
    ],
    promptVersion: "gululu-ai-first-vision-review-v1",
    reviewRunId: "vision-review-this52-v1",
    startedAt,
    status: visionSummary.vision.status,
    taskKind: "image-type-labeling+role-classification+matting-gate",
  };

  await writeCsv(path.join(args.reviewDir, "vision-group-decisions.csv"), visionRows, ["visualGroupId", "assetKind", "renderUse", "candidateRoleName", "locationName", "manga", "mattingAllowed", "needsMatting", "confidence", "evidenceSummary", "conflictReason", "reviewStatus", "tags", "memberSourceRelPaths", "reviewedBy", "reviewRunId"]);
  await writeCsv(path.join(args.reviewDir, "image-type-labels.vision.csv"), updatedTypeRows, ["evidencePackId", "sourceRelPath", "sha256", "programTypeHint", "llmTypeLabel", "assetKind", "renderUse", "confidence", "evidenceSummary", "reviewRunId", "reviewStatus"]);
  await writeCsv(path.join(args.reviewDir, "role-classification-candidates.vision.csv"), updatedRoleRows, ["visualGroupId", "candidateRoleName", "assetKind", "renderUse", "locationName", "confidence", "evidencePackIds", "speakerEvidence", "visualEvidence", "pathEvidence", "conflictReason", "reviewRunId", "reviewStatus"]);
  await writeCsv(path.join(args.reviewDir, "image-decisions.vision.csv"), updatedImageRows, ["sourceRelPath", "sha256", "evidencePackId", "visualGroupId", "allSourceRelPaths", "duplicateSourceRelPaths", "decisionStatus", "assetKind", "renderUse", "character", "candidateRoleName", "roleConfidence", "visualStatus", "locationName", "mattingAllowed", "needsMatting", "mattingStatus", "visualRelationType", "canonicalSha256", "relationStatus", "relationReviewedBy", "featureCandidateCount", "aiReviewRunIds", "confidence", "anomalyStatus", "samplingStatus", "exclude", "evidenceSummary", "notes"]);
  await writeCsv(path.join(args.reviewDir, "matting-decisions.vision.csv"), updatedMattingRows, ["sourceRelPath", "sha256", "assetKind", "renderUse", "mattingAllowed", "needsMatting", "mattingStatus", "mattingModel", "transparentRelPath", "alphaMaskRelPath", "qaStatus", "qaReason"]);
  await writeCsv(path.join(args.reviewDir, "anomaly-queue.vision.csv"), anomalyRows, ["anomalyId", "anomalyKind", "severity", "evidencePackIds", "visualGroupId", "candidateRoleNames", "sourceRelPaths", "confidence", "conflictReason", "suggestedAction", "reviewStatus", "resolutionRef", "notes"]);
  await writeJson(path.join(args.reviewDir, "summary.vision.json"), visionSummary);
  await writeJson(path.join(args.reviewDir, "ai-review-runs.vision.json"), [visionRun]);
  await writeVisionHtml(args.reviewDir, visionSummary, visionRows, anomalyRows);
  console.log(JSON.stringify({
    apiCalls,
    cachePath,
    reviewHtml: path.join(args.reviewDir, "review-vision.html"),
    summary: visionSummary,
  }, null, 2));
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
