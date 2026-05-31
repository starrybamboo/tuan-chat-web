import { Buffer } from "node:buffer";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = "D:/gululu-cache/output/opus-88-owner-only-refetch-v3";
const DEFAULT_PORT = 48788;
const REVIEW_DIR_NAME = "image-role-review-copy";
const CSV_HEADERS = ["sourceRelPath", "sha256", "confirmedCharacter", "assetKind", "exclude", "notes"];
const STATUS_ORDER = new Map([
  ["conflict", 0],
  ["unknown", 1],
  ["low-confidence", 2],
  ["candidate", 3],
  ["confirmed", 4],
  ["excluded", 5],
]);

function parseArgs(argv) {
  const args = {
    host: "127.0.0.1",
    port: DEFAULT_PORT,
    root: DEFAULT_ROOT,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--root") {
      args.root = argv[++index];
    }
    else if (arg === "--port") {
      args.port = Number(argv[++index]);
    }
    else if (arg === "--host") {
      args.host = argv[++index];
    }
    else {
      throw new Error(`未知参数: ${arg}`);
    }
  }
  return args;
}

function normalizeLineBreaks(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted && char === "\"" && line[index + 1] === "\"") {
      current += "\"";
      index += 1;
      continue;
    }
    if (char === "\"") {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function responseJson(response, data, status = 200) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(data));
}

function responseText(response, text, contentType = "text/plain; charset=utf-8", status = 200) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": contentType,
  });
  response.end(text);
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  }
  catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function readCorrections(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    const lines = normalizeLineBreaks(text).split("\n").filter(Boolean);
    const headers = parseCsvLine(lines.shift() ?? "");
    const rows = new Map();
    for (const line of lines) {
      const cells = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
      const key = row.sourceRelPath || row.sha256;
      if (key) {
        rows.set(key, {
          assetKind: row.assetKind ?? "",
          confirmedCharacter: row.confirmedCharacter ?? "",
          exclude: row.exclude ?? "",
          notes: row.notes ?? "",
          sha256: row.sha256 ?? "",
          sourceRelPath: row.sourceRelPath ?? "",
        });
      }
    }
    return rows;
  }
  catch (error) {
    if (error.code === "ENOENT") {
      return new Map();
    }
    throw error;
  }
}

async function writeCorrections(filePath, rows) {
  const sorted = [...rows.values()].sort((left, right) => {
    return String(left.sourceRelPath).localeCompare(String(right.sourceRelPath), "zh-Hans-CN");
  });
  const body = sorted.map(row => CSV_HEADERS.map(header => csvEscape(row[header] ?? "")).join(",")).join("\n");
  await writeFile(filePath, `${CSV_HEADERS.join(",")}\n${body}${body ? "\n" : ""}`, "utf8");
}

async function writeDecisions(filePath, decisions) {
  const payload = {
    decisions: Object.fromEntries(decisions),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function correctionKey(entry) {
  return entry.groupKey || entry.sourceRelPath || entry.sha256;
}

function correctionForEntry(entry, corrections) {
  for (const sourceRelPath of entry.sourceRelPaths ?? [entry.sourceRelPath]) {
    const correction = corrections.get(sourceRelPath);
    if (correction?.confirmedCharacter?.trim() || /^(?:[1y是]|yes|true)$/i.test(correction?.exclude ?? "")) {
      return correction;
    }
  }
  return corrections.get(entry.sourceRelPath) ?? corrections.get(entry.sha256);
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items.filter(Boolean)) {
    const key = keyFn(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function chooseRepresentativeEntry(entries) {
  return [...entries].sort((left, right) => {
    if (Boolean(right.confirmedCharacter) !== Boolean(left.confirmedCharacter)) {
      return right.confirmedCharacter ? 1 : -1;
    }
    return (right.confidence ?? 0) - (left.confidence ?? 0);
  })[0];
}

function mergeDuplicateEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.sha256 ? `sha256:${entry.sha256}` : `source:${entry.sourceRelPath}`;
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([groupKey, group]) => {
    if (group.length === 1) {
      return {
        ...group[0],
        duplicateCount: 1,
        groupKey,
        outputRelPaths: [group[0].outputRelPath],
        sourceRelPaths: [group[0].sourceRelPath],
      };
    }

    const representative = chooseRepresentativeEntry(group);
    const candidateNames = new Set(group.map(entry => entry.candidateCharacter).filter(Boolean));
    const reviewStatuses = new Set(group.map(entry => entry.reviewStatus).filter(Boolean));
    const mergedReviewStatus = candidateNames.size > 1 || reviewStatuses.has("conflict")
      ? "conflict"
      : representative.reviewStatus;

    return {
      ...representative,
      bucket: candidateNames.size > 1 ? "重复图片候选冲突" : representative.bucket,
      contexts: uniqueBy(group.flatMap(entry => entry.contexts ?? []), (ctx) => {
        return `${ctx.floor ?? ""}|${ctx.imageIndexInFloor ?? ""}|${ctx.before ?? ""}|${ctx.after ?? ""}`;
      }),
      duplicateCount: group.length,
      duplicateSourceRelPaths: group.map(entry => entry.sourceRelPath),
      evidence: uniqueBy(group.flatMap(entry => entry.evidence ?? []), (ev) => {
        return `${ev.source ?? ""}|${ev.character ?? ""}|${ev.detail ?? ""}`;
      }),
      groupKey,
      outputRelPaths: group.map(entry => entry.outputRelPath),
      reviewStatus: mergedReviewStatus,
      sourceRelPaths: group.map(entry => entry.sourceRelPath),
    };
  });
}

function decorateEntry(entry, corrections, decisions) {
  const correction = correctionForEntry(entry, corrections);
  const decision = decisions.get(correctionKey(entry));
  let effectiveStatus = entry.reviewStatus;
  if (/^(?:[1y是]|yes|true)$/i.test(correction?.exclude ?? "")) {
    effectiveStatus = "excluded";
  }
  else if (correction?.confirmedCharacter?.trim()) {
    effectiveStatus = "confirmed";
  }
  else if (decision?.status === "wrong") {
    effectiveStatus = "wrong";
  }
  return {
    bucket: entry.bucket,
    candidateCharacter: entry.candidateCharacter,
    confidence: entry.confidence,
    contexts: entry.contexts,
    correction: correction ?? null,
    decision: decision ?? null,
    evidence: entry.evidence,
    effectiveStatus,
    firstFloor: entry.contexts?.[0]?.floor ?? "",
    id: correctionKey(entry),
    outputRelPath: entry.outputRelPath,
    duplicateCount: entry.duplicateCount ?? 1,
    duplicateSourceRelPaths: entry.duplicateSourceRelPaths ?? [],
    reviewStatus: entry.reviewStatus,
    sha256: entry.sha256,
    sourceRelPath: entry.sourceRelPath,
    sourceRelPaths: entry.sourceRelPaths ?? [entry.sourceRelPath],
  };
}

function sortEntries(left, right) {
  const leftOrder = STATUS_ORDER.get(left.effectiveStatus) ?? 9;
  const rightOrder = STATUS_ORDER.get(right.effectiveStatus) ?? 9;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  if (left.bucket !== right.bucket) {
    return String(left.bucket).localeCompare(String(right.bucket), "zh-Hans-CN");
  }
  return String(left.sourceRelPath).localeCompare(String(right.sourceRelPath), "zh-Hans-CN");
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function makeCorrection(entry, patch, corrections) {
  const existing = correctionForEntry(entry, corrections);
  return {
    assetKind: existing?.assetKind ?? "",
    confirmedCharacter: existing?.confirmedCharacter ?? "",
    exclude: existing?.exclude ?? "",
    notes: existing?.notes ?? "",
    sha256: entry.sha256,
    sourceRelPath: entry.sourceRelPath,
    ...patch,
  };
}

class ReviewStore {
  constructor(paths) {
    this.paths = paths;
    this.corrections = new Map();
    this.decisions = new Map();
    this.entries = [];
    this.redoStack = [];
    this.undoStack = [];
  }

  async load() {
    const manifest = JSON.parse(await readFile(this.paths.manifest, "utf8"));
    const decisionsFile = await readJsonIfExists(this.paths.decisions, { decisions: {} });
    this.entries = mergeDuplicateEntries(manifest.entries);
    this.corrections = await readCorrections(this.paths.corrections);
    this.decisions = new Map(Object.entries(decisionsFile.decisions ?? {}));
  }

  snapshot(entry) {
    const key = correctionKey(entry);
    return {
      correction: correctionForEntry(entry, this.corrections) ?? null,
      corrections: (entry.sourceRelPaths ?? [entry.sourceRelPath]).map((sourceRelPath) => {
        return {
          correction: this.corrections.get(sourceRelPath) ?? null,
          sourceRelPath,
        };
      }),
      decision: this.decisions.get(key) ?? null,
      key,
    };
  }

  restore(snapshot) {
    if (snapshot.corrections) {
      for (const item of snapshot.corrections) {
        if (item.correction) {
          this.corrections.set(item.sourceRelPath, item.correction);
        }
        else {
          this.corrections.delete(item.sourceRelPath);
        }
      }
    }
    else if (snapshot.correction) {
      this.corrections.set(snapshot.key, snapshot.correction);
    }
    if (snapshot.decision) {
      this.decisions.set(snapshot.key, snapshot.decision);
    }
    else {
      this.decisions.delete(snapshot.key);
    }
  }

  async persist() {
    await writeCorrections(this.paths.corrections, this.corrections);
    await writeDecisions(this.paths.decisions, this.decisions);
  }

  findEntry(id) {
    const entry = this.entries.find(item => correctionKey(item) === id);
    if (!entry) {
      throw new Error(`找不到图片: ${id}`);
    }
    return entry;
  }

  list() {
    return this.entries
      .map(entry => decorateEntry(entry, this.corrections, this.decisions))
      .sort(sortEntries);
  }

  summary() {
    const summary = {};
    for (const entry of this.list()) {
      summary[entry.effectiveStatus] = (summary[entry.effectiveStatus] ?? 0) + 1;
    }
    return summary;
  }

  async apply(id, type, payload = {}) {
    if (type === "undo") {
      return this.undo();
    }
    if (type === "redo") {
      return this.redo();
    }

    const entry = this.findEntry(id);
    const before = this.snapshot(entry);
    const key = before.key;

    if (type === "confirm") {
      const character = payload.character?.trim() || entry.candidateCharacter?.trim();
      if (!character) {
        throw new Error("这张图没有候选角色，请先输入角色名再确认。");
      }
      for (const sourceRelPath of entry.sourceRelPaths ?? [entry.sourceRelPath]) {
        this.corrections.set(sourceRelPath, makeCorrection({
          sha256: entry.sha256,
          sourceRelPath,
          sourceRelPaths: [sourceRelPath],
        }, {
          assetKind: "avatar",
          confirmedCharacter: character,
          exclude: "",
          notes: payload.notes ?? "",
        }, this.corrections));
      }
      this.decisions.delete(key);
    }
    else if (type === "wrong") {
      this.decisions.set(key, {
        at: new Date().toISOString(),
        candidateCharacter: entry.candidateCharacter ?? "",
        status: "wrong",
      });
      this.corrections.set(key, makeCorrection(entry, {
        notes: `候选不对${entry.candidateCharacter ? `: ${entry.candidateCharacter}` : ""}`,
      }, this.corrections));
    }
    else if (type === "exclude") {
      for (const sourceRelPath of entry.sourceRelPaths ?? [entry.sourceRelPath]) {
        this.corrections.set(sourceRelPath, makeCorrection({
          sha256: entry.sha256,
          sourceRelPath,
          sourceRelPaths: [sourceRelPath],
        }, {
          assetKind: payload.assetKind || "excluded",
          confirmedCharacter: "",
          exclude: "true",
          notes: payload.notes || "非头像/排除",
        }, this.corrections));
      }
      this.decisions.delete(key);
    }
    else {
      throw new Error(`未知操作: ${type}`);
    }

    const after = this.snapshot(entry);
    this.undoStack.push({ after, before });
    this.redoStack = [];
    await this.persist();
    return decorateEntry(entry, this.corrections, this.decisions);
  }

  async undo() {
    const item = this.undoStack.pop();
    if (!item) {
      return null;
    }
    this.restore(item.before);
    this.redoStack.push(item);
    await this.persist();
    return true;
  }

  async redo() {
    const item = this.redoStack.pop();
    if (!item) {
      return null;
    }
    this.restore(item.after);
    this.undoStack.push(item);
    await this.persist();
    return true;
  }
}

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg")
    return "image/jpeg";
  if (ext === ".png")
    return "image/png";
  if (ext === ".gif")
    return "image/gif";
  if (ext === ".webp")
    return "image/webp";
  if (ext === ".bmp")
    return "image/bmp";
  return "application/octet-stream";
}

async function serveImage(response, reviewDir, relPath) {
  const fullPath = path.resolve(reviewDir, relPath);
  const reviewRoot = path.resolve(reviewDir);
  if (!fullPath.startsWith(`${reviewRoot}${path.sep}`)) {
    responseText(response, "bad path", "text/plain; charset=utf-8", 400);
    return;
  }
  await stat(fullPath);
  response.writeHead(200, {
    "cache-control": "public, max-age=3600",
    "content-type": getMime(fullPath),
  });
  response.end(await readFile(fullPath));
}

const html = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>咕噜噜头像审查台</title>
  <style>
    :root {
      color-scheme: light;
      font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
      background: #f6f7f4;
      color: #20211f;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; }
    button, input, select { font: inherit; }
    .app {
      display: grid;
      grid-template-columns: 280px minmax(360px, 1fr) 360px;
      height: 100vh;
      min-width: 960px;
    }
    .sidebar, .detail {
      overflow: auto;
      border-color: #d9ddd2;
      background: #fbfcf8;
    }
    .sidebar { border-right: 1px solid #d9ddd2; }
    .detail { border-left: 1px solid #d9ddd2; }
    .panel-head {
      position: sticky;
      top: 0;
      z-index: 2;
      padding: 14px;
      border-bottom: 1px solid #d9ddd2;
      background: #fbfcf8;
    }
    h1 { margin: 0 0 10px; font-size: 18px; font-weight: 700; }
    .filters { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    select, input {
      width: 100%;
      height: 34px;
      border: 1px solid #cbd1c2;
      border-radius: 6px;
      background: #fff;
      padding: 0 10px;
    }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
      color: #555c50;
      font-size: 12px;
    }
    .stat {
      border: 1px solid #d9ddd2;
      border-radius: 999px;
      padding: 3px 8px;
      background: #fff;
    }
    .list { padding: 8px; }
    .item {
      width: 100%;
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      padding: 8px;
      text-align: left;
      cursor: pointer;
    }
    .item:hover { background: #eef2e7; }
    .item.active { border-color: #6f8f52; background: #e7eedc; }
    .item-title { display: flex; justify-content: space-between; gap: 8px; font-weight: 650; }
    .item-sub { margin-top: 4px; color: #66705e; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .viewer {
      display: grid;
      grid-template-rows: 1fr auto;
      min-width: 0;
      min-height: 0;
      background: #eef0ea;
    }
    .stage {
      display: grid;
      place-items: center;
      min-height: 0;
      padding: 18px;
    }
    .stage img {
      max-width: 100%;
      max-height: calc(100vh - 130px);
      object-fit: contain;
      background: #fff;
      border: 1px solid #d2d6ca;
      border-radius: 6px;
      box-shadow: 0 16px 45px rgba(31, 36, 24, 0.16);
    }
    .actions {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 10px;
      padding: 12px;
      border-top: 1px solid #d9ddd2;
      background: #fbfcf8;
    }
    .actions button {
      height: 40px;
      border: 1px solid #bfc9b2;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
    }
    .actions button.primary { background: #2f5f3f; border-color: #2f5f3f; color: white; }
    .actions button.bad { background: #7f2f2f; border-color: #7f2f2f; color: white; }
    .section { padding: 14px; border-bottom: 1px solid #e1e4db; }
    .label { color: #66705e; font-size: 12px; margin-bottom: 6px; }
    .value { font-size: 14px; overflow-wrap: anywhere; }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #e9eee1;
      color: #405235;
      font-size: 12px;
      margin: 0 6px 6px 0;
    }
    .context {
      padding: 10px;
      border: 1px solid #d9ddd2;
      border-radius: 6px;
      background: #fff;
      margin-bottom: 8px;
      font-size: 13px;
      line-height: 1.55;
    }
    .muted { color: #66705e; }
    .toast {
      position: fixed;
      left: 50%;
      bottom: 72px;
      transform: translateX(-50%);
      padding: 10px 14px;
      border-radius: 6px;
      background: rgba(32, 33, 31, 0.9);
      color: #fff;
      opacity: 0;
      pointer-events: none;
      transition: opacity .16s ease;
    }
    .toast.show { opacity: 1; }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="panel-head">
        <h1>头像审查台</h1>
        <div class="filters">
          <select id="statusFilter">
            <option value="">全部状态</option>
            <option value="conflict">冲突</option>
            <option value="unknown">未识别</option>
            <option value="low-confidence">低置信度</option>
            <option value="candidate">候选</option>
            <option value="wrong">不对</option>
            <option value="confirmed">已确认</option>
            <option value="excluded">已排除</option>
          </select>
          <input id="searchInput" placeholder="筛角色/文件" />
        </div>
        <div class="stats" id="stats"></div>
      </div>
      <div class="list" id="list"></div>
    </aside>
    <main class="viewer">
      <div class="stage"><img id="preview" alt="" /></div>
      <div class="actions">
        <button id="prevBtn">← 上一张</button>
        <button id="undoBtn">撤销</button>
        <button id="wrongBtn" class="bad">Q 不对</button>
        <button id="confirmBtn" class="primary">空格 确认</button>
        <button id="excludeBtn">排除</button>
        <button id="redoBtn">重做</button>
        <button id="nextBtn">下一张 →</button>
      </div>
    </main>
    <aside class="detail">
      <div class="panel-head">
        <h1 id="candidateTitle">-</h1>
        <div class="muted" id="progressText"></div>
      </div>
      <div class="section">
        <div class="label">改成角色名后确认</div>
        <input id="characterInput" placeholder="角色名" />
      </div>
      <div class="section">
        <div class="label">状态</div>
        <div id="statusBadges"></div>
      </div>
      <div class="section">
        <div class="label">证据</div>
        <div id="evidence"></div>
      </div>
      <div class="section">
        <div class="label">出现上下文</div>
        <div id="contexts"></div>
      </div>
      <div class="section">
        <div class="label">文件</div>
        <div class="value" id="filePath"></div>
      </div>
    </aside>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    const state = { entries: [], filtered: [], currentIndex: 0, summary: {} };
    const el = id => document.getElementById(id);

    function toast(text) {
      const node = el("toast");
      node.textContent = text;
      node.classList.add("show");
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => node.classList.remove("show"), 1200);
    }

    function statusLabel(status) {
      return {
        "candidate": "候选",
        "conflict": "冲突",
        "confirmed": "已确认",
        "excluded": "已排除",
        "low-confidence": "低置信度",
        "unknown": "未识别",
        "wrong": "不对",
      }[status] || status;
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    async function loadState(keepId) {
      const res = await fetch("/api/state");
      const data = await res.json();
      state.entries = data.entries;
      state.summary = data.summary;
      applyFilters(keepId);
    }

    function applyFilters(keepId) {
      const status = el("statusFilter").value;
      const q = el("searchInput").value.trim().toLowerCase();
      state.filtered = state.entries.filter(item => {
        if (status && item.effectiveStatus !== status) return false;
        if (!q) return true;
        const hay = [item.bucket, item.candidateCharacter, item.sourceRelPath, item.outputRelPath, item.effectiveStatus].join(" ").toLowerCase();
        return hay.includes(q);
      });
      if (keepId) {
        const next = state.filtered.findIndex(item => item.id === keepId);
        state.currentIndex = next >= 0 ? next : Math.min(state.currentIndex, Math.max(0, state.filtered.length - 1));
      } else {
        state.currentIndex = Math.min(state.currentIndex, Math.max(0, state.filtered.length - 1));
      }
      render();
    }

    function current() {
      return state.filtered[state.currentIndex];
    }

    function renderStats() {
      el("stats").innerHTML = Object.entries(state.summary)
        .map(([key, value]) => '<span class="stat">' + escapeHtml(statusLabel(key)) + ' ' + value + '</span>')
        .join("");
    }

    function renderList() {
      const list = el("list");
      const start = Math.max(0, state.currentIndex - 80);
      const end = Math.min(state.filtered.length, state.currentIndex + 120);
      list.innerHTML = state.filtered.slice(start, end).map((item, offset) => {
        const index = start + offset;
        const active = index === state.currentIndex ? " active" : "";
        const title = item.candidateCharacter || item.bucket || "未识别";
        const duplicateText = item.duplicateCount > 1 ? ' · 重复 ' + item.duplicateCount + ' 张' : '';
        return '<button class="item' + active + '" data-index="' + index + '">'
          + '<div class="item-title"><span>' + escapeHtml(title) + '</span><span>' + escapeHtml(statusLabel(item.effectiveStatus)) + '</span></div>'
          + '<div class="item-sub">第' + escapeHtml(item.firstFloor || "-") + '楼 · ' + (item.confidence || 0).toFixed(2) + duplicateText + ' · ' + escapeHtml(item.sourceRelPath) + '</div>'
          + '</button>';
      }).join("");
      list.querySelectorAll(".item").forEach(button => {
        button.addEventListener("click", () => {
          state.currentIndex = Number(button.dataset.index);
          render();
        });
      });
    }

    function renderDetail() {
      const item = current();
      if (!item) {
        el("preview").removeAttribute("src");
        el("candidateTitle").textContent = "没有待审图片";
        el("progressText").textContent = "";
        return;
      }
      el("preview").src = "/image/" + encodeURIComponent(item.outputRelPath);
      el("candidateTitle").textContent = item.candidateCharacter || item.bucket || "未识别";
      el("progressText").textContent = (state.currentIndex + 1) + " / " + state.filtered.length;
      el("characterInput").value = item.correction?.confirmedCharacter || item.candidateCharacter || "";
      el("statusBadges").innerHTML = [
        item.effectiveStatus,
        item.reviewStatus,
        item.bucket,
        item.confidence ? "置信度 " + (item.confidence || 0).toFixed(3) : "",
        item.duplicateCount > 1 ? "重复 " + item.duplicateCount + " 张" : "",
      ].filter(Boolean).map(text => '<span class="badge">' + escapeHtml(text) + '</span>').join("");
      el("evidence").innerHTML = (item.evidence || []).slice(0, 8).map(ev => {
        return '<div class="context"><b>' + escapeHtml(ev.character || "-") + '</b> <span class="muted">' + escapeHtml(ev.source || "") + ' ' + (ev.confidence || 0).toFixed(2) + '</span><br>' + escapeHtml(ev.detail || "") + '</div>';
      }).join("") || '<div class="muted">暂无证据</div>';
      el("contexts").innerHTML = (item.contexts || []).slice(0, 8).map(ctx => {
        return '<div class="context"><b>第' + escapeHtml(ctx.floor) + '楼</b><br><span class="muted">前：</span>' + escapeHtml(ctx.before || "") + '<br><span class="muted">后：</span>' + escapeHtml(ctx.after || "") + '</div>';
      }).join("") || '<div class="muted">暂无上下文</div>';
      el("filePath").textContent = item.duplicateCount > 1
        ? item.outputRelPath + "\n\n重复来源：\n" + (item.sourceRelPaths || []).slice(0, 30).join("\n")
        : item.outputRelPath;
    }

    function render() {
      renderStats();
      renderList();
      renderDetail();
    }

    function move(delta) {
      if (!state.filtered.length) return;
      state.currentIndex = Math.max(0, Math.min(state.filtered.length - 1, state.currentIndex + delta));
      render();
    }

    async function action(type) {
      const item = current();
      const payload = type === "confirm" ? { character: el("characterInput").value.trim() } : {};
      if (!item && !["undo", "redo"].includes(type)) return;
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item?.id, type, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "操作失败");
        return;
      }
      const nextId = state.filtered[Math.min(state.currentIndex + 1, state.filtered.length - 1)]?.id;
      await loadState(nextId);
      toast(type === "confirm" ? "已确认" : type === "wrong" ? "已标不对" : type === "undo" ? "已撤销" : type === "redo" ? "已重做" : "已处理");
    }

    el("prevBtn").addEventListener("click", () => move(-1));
    el("undoBtn").addEventListener("click", () => action("undo"));
    el("nextBtn").addEventListener("click", () => move(1));
    el("confirmBtn").addEventListener("click", () => action("confirm"));
    el("wrongBtn").addEventListener("click", () => action("wrong"));
    el("excludeBtn").addEventListener("click", () => action("exclude"));
    el("redoBtn").addEventListener("click", () => action("redo"));
    el("statusFilter").addEventListener("change", () => applyFilters());
    el("searchInput").addEventListener("input", () => applyFilters());

    document.addEventListener("keydown", event => {
      const tag = event.target.tagName;
      const editing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        action("undo");
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "x") {
        event.preventDefault();
        action("redo");
        return;
      }
      if (editing) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }
      else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      }
      else if (event.key === " ") {
        event.preventDefault();
        action("confirm");
      }
      else if (event.key.toLowerCase() === "q") {
        event.preventDefault();
        action("wrong");
      }
    });

    loadState();
  </script>
</body>
</html>`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root);
  const reviewDir = path.join(root, REVIEW_DIR_NAME);
  const paths = {
    corrections: path.join(reviewDir, "corrections.csv"),
    decisions: path.join(reviewDir, "review-decisions.json"),
    manifest: path.join(reviewDir, "manifest.json"),
  };
  await mkdir(reviewDir, { recursive: true });
  const store = new ReviewStore(paths);
  await store.load();

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
      if (request.method === "GET" && url.pathname === "/") {
        responseText(response, html, "text/html; charset=utf-8");
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/state") {
        responseJson(response, {
          entries: store.list(),
          summary: store.summary(),
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/action") {
        const body = await readRequestBody(request);
        const result = await store.apply(body.id, body.type, body);
        responseJson(response, {
          ok: true,
          result,
          summary: store.summary(),
        });
        return;
      }
      if (request.method === "GET" && url.pathname.startsWith("/image/")) {
        const relPath = decodeURIComponent(url.pathname.slice("/image/".length));
        await serveImage(response, reviewDir, relPath);
        return;
      }
      responseText(response, "not found", "text/plain; charset=utf-8", 404);
    }
    catch (error) {
      responseJson(response, { error: error?.message ?? String(error) }, 500);
    }
  });

  server.listen(args.port, args.host, () => {
    console.log(`咕噜噜头像审查台已启动: http://${args.host}:${args.port}/`);
    console.log(`工作目录: ${root}`);
  });
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
