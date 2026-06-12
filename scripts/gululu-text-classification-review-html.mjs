#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_ROOT = "D:/gululu-cache/output/opus-88-owner-only-refetch-v3";
const DEFAULT_OUT_DIR_NAME = "text-classification-manual-v1";

function parseArgs(argv) {
  const options = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options.set(key, "true");
      continue;
    }
    options.set(key, next);
    index += 1;
  }
  const root = path.resolve(options.get("root") ?? DEFAULT_ROOT);
  const outDir = path.resolve(options.get("out-dir") ?? path.join(root, DEFAULT_OUT_DIR_NAME));
  return {
    htmlPath: path.resolve(options.get("html") ?? path.join(outDir, "classification-review.html")),
    outDir,
    root,
  };
}

function normalizeLineBreaks(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

async function readSourceFloors(root) {
  const partsDir = path.join(root, "parts");
  const partNames = (await fs.readdir(partsDir))
    .filter((name) => name.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right));
  const byFloor = new Map();
  for (const partName of partNames) {
    const text = normalizeLineBreaks(await fs.readFile(path.join(partsDir, partName), "utf8"));
    const matches = [...text.matchAll(/^## 第(\d+)楼/gm)];
    matches.forEach((matched, index) => {
      const floor = Number(matched[1]);
      const start = matched.index;
      const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
      const raw = text.slice(start, end).trim();
      const sourceTime = raw.match(/^> 时间:\s*(.+)$/m)?.[1]?.trim() ?? "";
      byFloor.set(floor, { floor, partName, raw, sourceTime });
    });
  }
  return byFloor;
}

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

function escapeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function buildData({ root, store, sources }) {
  const floors = (store.floors ?? [])
    .map((floorRecord) => {
      const floor = Number(floorRecord.floor);
      const source = sources.get(floor);
      return {
        events: floorRecord.events ?? [],
        floor,
        notes: floorRecord.notes ?? "",
        partName: floorRecord.partName ?? source?.partName ?? "",
        raw: source?.raw ?? "",
        sourceTime: floorRecord.sourceTime ?? source?.sourceTime ?? "",
        status: floorRecord.status ?? "",
        summary: floorRecord.summary ?? "",
      };
    })
    .sort((left, right) => left.floor - right.floor);
  const events = floors.flatMap((floor) => floor.events);
  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: root,
    stats: {
      eventCount: events.length,
      floorCount: floors.length,
      kindCounts: countBy(events.map((event) => event.kind)),
      performanceUseCounts: countBy(events.map((event) => event.performanceUse)),
    },
    taxonomy: store.taxonomy ?? [],
    floors,
  };
}

function renderHtml(data) {
  const json = escapeJsonForScript(data);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gululu 文本清洗交互审查</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --panel-2: #f0f3f6;
      --text: #1d252d;
      --muted: #64707d;
      --line: #d8dde4;
      --accent: #0f766e;
      --accent-2: #155e75;
      --bad: #b42318;
      --warn: #b7791f;
      --good: #287a3e;
      --shadow: 0 10px 30px rgba(27, 39, 52, 0.10);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    button, input, select, textarea {
      font: inherit;
    }
    button {
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--text);
      border-radius: 6px;
      padding: 7px 10px;
      cursor: pointer;
    }
    button:hover { border-color: var(--accent); }
    button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: white;
    }
    button.active {
      border-color: var(--accent-2);
      background: #dff3ef;
      color: #073b37;
    }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: white;
      color: var(--text);
      padding: 8px 10px;
    }
    textarea {
      min-height: 70px;
      resize: vertical;
    }
    .app {
      display: grid;
      grid-template-columns: 360px minmax(0, 1fr);
      min-height: 100vh;
    }
    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      border-right: 1px solid var(--line);
      background: var(--panel);
      padding: 16px;
    }
    .main {
      min-width: 0;
      padding: 20px 24px 48px;
    }
    .title {
      display: flex;
      gap: 10px;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .title h1 {
      margin: 0;
      font-size: 20px;
      line-height: 1.2;
    }
    .muted { color: var(--muted); }
    .small { font-size: 12px; }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin: 12px 0;
    }
    .stat {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 9px;
      background: var(--panel-2);
    }
    .stat strong {
      display: block;
      font-size: 18px;
    }
    .section {
      border-top: 1px solid var(--line);
      padding-top: 14px;
      margin-top: 14px;
    }
    .section h2 {
      margin: 0 0 9px;
      font-size: 14px;
    }
    .row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .row > * { min-width: 0; }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 9px;
      background: white;
      white-space: nowrap;
    }
    .chip input {
      width: auto;
      margin: 0;
    }
    .floor-list {
      display: grid;
      gap: 6px;
      max-height: 38vh;
      overflow: auto;
      padding-right: 4px;
    }
    .floor-button {
      text-align: left;
      display: grid;
      grid-template-columns: 52px minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      padding: 8px;
      border-radius: 6px;
    }
    .floor-button .summary {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid var(--line);
      background: #f7fafc;
    }
    .status-ok { background: var(--good); border-color: var(--good); }
    .status-problem { background: var(--bad); border-color: var(--bad); }
    .status-skip { background: var(--warn); border-color: var(--warn); }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255,255,255,0.94);
      backdrop-filter: blur(8px);
      box-shadow: var(--shadow);
      padding: 12px;
      margin-bottom: 16px;
    }
    .toolbar-top {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .floor-head {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 16px;
      margin-bottom: 16px;
    }
    .floor-head h2 {
      margin: 0 0 8px;
      font-size: 24px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }
    .meta-cell {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel-2);
      padding: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .review-box {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 10px;
      margin-top: 12px;
      align-items: start;
    }
    .segmented {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .event-list {
      display: grid;
      gap: 10px;
      margin-bottom: 16px;
    }
    .event {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 12px;
    }
    .event.problem {
      border-color: rgba(180, 35, 24, 0.55);
      background: #fff7f6;
    }
    .event-head {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
    .badge {
      border-radius: 999px;
      padding: 3px 8px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      font-size: 12px;
      color: #27323b;
    }
    .badge.kind-dialog { background: #e6f7ed; }
    .badge.kind-dice { background: #fff3d8; }
    .badge.kind-narration { background: #e9f1ff; }
    .badge.kind-bgm { background: #f0e9ff; }
    .badge.kind-reference { background: #edf2f7; }
    .badge.kind-author_note { background: #fff0f0; }
    .badge.kind-scene { background: #e6fffb; }
    .badge.kind-system { background: #f3f4f6; }
    .event p {
      margin: 6px 0;
    }
    .event-review {
      display: none;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
      border-top: 1px solid var(--line);
      padding-top: 10px;
    }
    .event.problem .event-review { display: grid; }
    .event-review textarea {
      grid-column: 1 / -1;
    }
    .source-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    .source {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      overflow: hidden;
    }
    .source-body {
      padding: 14px;
      max-width: 980px;
    }
    .source-rendered h2 {
      margin: 0 0 8px;
      font-size: 18px;
    }
    .source-rendered blockquote {
      margin: 0 0 12px;
      padding-left: 10px;
      border-left: 3px solid var(--line);
      color: var(--muted);
    }
    .source-rendered p {
      margin: 0 0 12px;
      white-space: pre-wrap;
    }
    .source-rendered img {
      display: block;
      max-width: min(100%, 760px);
      max-height: 720px;
      object-fit: contain;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      margin: 10px 0 14px;
    }
    pre {
      margin: 0;
      padding: 14px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      background: #101820;
      color: #edf2f7;
      font-family: "Cascadia Mono", Consolas, monospace;
      font-size: 13px;
      line-height: 1.55;
    }
    .hidden { display: none !important; }
    .empty {
      border: 1px dashed var(--line);
      border-radius: 8px;
      padding: 16px;
      background: var(--panel);
      color: var(--muted);
    }
    @media (max-width: 980px) {
      .app { grid-template-columns: 1fr; }
      .sidebar {
        position: static;
        height: auto;
        max-height: none;
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }
      .floor-list { max-height: 240px; }
      .main { padding: 14px; }
      .meta-grid, .review-box, .event-review { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="title">
        <h1>文本清洗审查</h1>
        <span class="small muted" id="save-state">未修改</span>
      </div>
      <div class="small muted" id="source-root"></div>
      <div class="stats">
        <div class="stat"><strong id="floor-count">0</strong><span>楼层</span></div>
        <div class="stat"><strong id="event-count">0</strong><span>事件</span></div>
        <div class="stat"><strong id="visible-count">0</strong><span>当前筛选</span></div>
        <div class="stat"><strong id="problem-count">0</strong><span>已标问题</span></div>
      </div>

      <div class="section">
        <h2>定位</h2>
        <div class="row">
          <input id="jump-input" inputmode="numeric" placeholder="楼层号，例如 123">
          <button id="jump-button">跳转</button>
        </div>
        <div style="height: 8px"></div>
        <input id="search-input" placeholder="搜索原文、摘要、textRef、角色">
      </div>

      <div class="section">
        <h2>审查状态</h2>
        <select id="status-filter">
          <option value="all">全部</option>
          <option value="unreviewed">未审</option>
          <option value="ok">通过</option>
          <option value="problem">有问题</option>
          <option value="skip">暂跳过</option>
        </select>
      </div>

      <div class="section">
        <h2>事件类型</h2>
        <div class="filters" id="kind-filters"></div>
      </div>

      <div class="section">
        <h2>演出用途</h2>
        <div class="filters" id="use-filters"></div>
      </div>

      <div class="section">
        <h2>数据</h2>
        <div class="row">
          <button id="export-button" class="primary">导出意见</button>
          <button id="import-button">导入意见</button>
        </div>
        <input id="import-file" class="hidden" type="file" accept="application/json,.json">
        <div style="height: 8px"></div>
        <button id="clear-button">清空本地意见</button>
      </div>

      <div class="section">
        <h2>楼层</h2>
        <div class="floor-list" id="floor-list"></div>
      </div>
    </aside>

    <main class="main">
      <div class="toolbar">
        <div class="toolbar-top">
          <div class="row">
            <button id="prev-button">上一楼</button>
            <button id="next-button">下一楼</button>
          </div>
          <div class="small muted">快捷键：J 下一楼，K 上一楼，1 通过，2 有问题，3 暂跳过</div>
        </div>
      </div>

      <section id="detail"></section>
    </main>
  </div>

  <script type="application/json" id="audit-data">${json}</script>
  <script>
    (function () {
      var data = JSON.parse(document.getElementById("audit-data").textContent);
      var floors = data.floors || [];
      var kinds = Object.keys(data.stats.kindCounts || {}).sort();
      var uses = Object.keys(data.stats.performanceUseCounts || {}).sort();
      var storageKey = "gululu-text-classification-review:" + data.sourceRoot;
      var state = loadState();
      var selectedFloor = floors.length ? floors[0].floor : null;
      var filteredFloors = floors.slice();
      var sourceMode = "rendered";

      var el = {
        clearButton: document.getElementById("clear-button"),
        detail: document.getElementById("detail"),
        eventCount: document.getElementById("event-count"),
        exportButton: document.getElementById("export-button"),
        floorCount: document.getElementById("floor-count"),
        floorList: document.getElementById("floor-list"),
        importButton: document.getElementById("import-button"),
        importFile: document.getElementById("import-file"),
        jumpButton: document.getElementById("jump-button"),
        jumpInput: document.getElementById("jump-input"),
        kindFilters: document.getElementById("kind-filters"),
        nextButton: document.getElementById("next-button"),
        prevButton: document.getElementById("prev-button"),
        problemCount: document.getElementById("problem-count"),
        saveState: document.getElementById("save-state"),
        searchInput: document.getElementById("search-input"),
        sourceRoot: document.getElementById("source-root"),
        statusFilter: document.getElementById("status-filter"),
        useFilters: document.getElementById("use-filters"),
        visibleCount: document.getElementById("visible-count")
      };

      function loadState() {
        try {
          var parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
          return {
            eventReviews: parsed.eventReviews || {},
            floorReviews: parsed.floorReviews || {}
          };
        }
        catch (_error) {
          return { eventReviews: {}, floorReviews: {} };
        }
      }

      function saveState() {
        try {
          localStorage.setItem(storageKey, JSON.stringify(state));
          el.saveState.textContent = "已保存本地";
        }
        catch (_error) {
          el.saveState.textContent = "本地保存受限";
        }
      }

      function escapeHtml(value) {
        return String(value == null ? "" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function create(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
      }

      function eventKey(floor, index) {
        return String(floor) + ":" + String(index + 1);
      }

      function floorReview(floor) {
        return state.floorReviews[String(floor)] || { status: "unreviewed", note: "" };
      }

      function setFloorReview(floor, patch) {
        var key = String(floor);
        state.floorReviews[key] = Object.assign({}, floorReview(floor), patch);
        saveState();
        updateStats();
        renderFloorList();
        renderDetail();
      }

      function eventReview(floor, index) {
        return state.eventReviews[eventKey(floor, index)] || {
          flagged: false,
          note: "",
          suggestedKind: "",
          suggestedUse: ""
        };
      }

      function setEventReview(floor, index, patch) {
        var key = eventKey(floor, index);
        state.eventReviews[key] = Object.assign({}, eventReview(floor, index), patch);
        saveState();
        updateStats();
        renderFloorList();
        renderDetail();
      }

      function getSelectedKinds() {
        return Array.prototype.slice.call(el.kindFilters.querySelectorAll("input:checked")).map(function (input) {
          return input.value;
        });
      }

      function getSelectedUses() {
        return Array.prototype.slice.call(el.useFilters.querySelectorAll("input:checked")).map(function (input) {
          return input.value;
        });
      }

      function floorText(floor) {
        var events = floor.events || [];
        var eventText = events.map(function (event) {
          return [
            event.kind,
            event.performanceUse,
            event.speakerName,
            event.roleName,
            event.summary,
            event.textRef,
            event.notes
          ].join(" ");
        }).join(" ");
        return [
          floor.floor,
          floor.partName,
          floor.sourceTime,
          floor.summary,
          floor.notes,
          floor.raw,
          eventText
        ].join(" ").toLowerCase();
      }

      function floorHasKind(floor, selectedKinds) {
        if (!selectedKinds.length) return true;
        return (floor.events || []).some(function (event) {
          return selectedKinds.indexOf(event.kind) >= 0;
        });
      }

      function floorHasUse(floor, selectedUses) {
        if (!selectedUses.length) return true;
        return (floor.events || []).some(function (event) {
          return selectedUses.indexOf(event.performanceUse) >= 0;
        });
      }

      function floorMatchesStatus(floor, status) {
        if (status === "all") return true;
        return floorReview(floor.floor).status === status;
      }

      function applyFilters() {
        var query = el.searchInput.value.trim().toLowerCase();
        var selectedKinds = getSelectedKinds();
        var selectedUses = getSelectedUses();
        var status = el.statusFilter.value;
        filteredFloors = floors.filter(function (floor) {
          return (!query || floorText(floor).indexOf(query) >= 0)
            && floorHasKind(floor, selectedKinds)
            && floorHasUse(floor, selectedUses)
            && floorMatchesStatus(floor, status);
        });
        if (!filteredFloors.some(function (floor) { return floor.floor === selectedFloor; })) {
          selectedFloor = filteredFloors.length ? filteredFloors[0].floor : null;
        }
        updateStats();
        renderFloorList();
        renderDetail();
      }

      function reviewClass(status) {
        if (status === "ok") return "status-ok";
        if (status === "problem") return "status-problem";
        if (status === "skip") return "status-skip";
        return "";
      }

      function renderFilterChips(container, values, prefix) {
        container.innerHTML = "";
        values.forEach(function (value) {
          var label = create("label", "chip");
          var input = document.createElement("input");
          input.type = "checkbox";
          input.value = value;
          input.id = prefix + value;
          input.addEventListener("change", applyFilters);
          label.appendChild(input);
          label.appendChild(document.createTextNode(value));
          container.appendChild(label);
        });
      }

      function renderFloorList() {
        el.floorList.innerHTML = "";
        if (!filteredFloors.length) {
          el.floorList.appendChild(create("div", "empty", "没有匹配楼层"));
          return;
        }
        var fragment = document.createDocumentFragment();
        filteredFloors.forEach(function (floor) {
          var review = floorReview(floor.floor);
          var button = create("button", "floor-button" + (floor.floor === selectedFloor ? " active" : ""));
          var floorNum = create("span", "", "#" + floor.floor);
          var summary = create("span", "summary", floor.summary || "(无摘要)");
          var dot = create("span", "status-dot " + reviewClass(review.status));
          button.title = floor.summary || "";
          button.appendChild(floorNum);
          button.appendChild(summary);
          button.appendChild(dot);
          button.addEventListener("click", function () {
            selectedFloor = floor.floor;
            renderFloorList();
            renderDetail();
            window.scrollTo({ top: 0, behavior: "smooth" });
          });
          fragment.appendChild(button);
        });
        el.floorList.appendChild(fragment);
      }

      function updateStats() {
        el.floorCount.textContent = String(data.stats.floorCount || floors.length);
        el.eventCount.textContent = String(data.stats.eventCount || 0);
        el.visibleCount.textContent = String(filteredFloors.length);
        el.sourceRoot.textContent = data.sourceRoot;
        var floorProblems = Object.values(state.floorReviews).filter(function (review) {
          return review.status === "problem";
        }).length;
        var eventProblems = Object.values(state.eventReviews).filter(function (review) {
          return review.flagged;
        }).length;
        el.problemCount.textContent = String(floorProblems + eventProblems);
      }

      function kindOptions(selected) {
        return kinds.map(function (kind) {
          return "<option value=\\"" + escapeHtml(kind) + "\\"" + (kind === selected ? " selected" : "") + ">" + escapeHtml(kind) + "</option>";
        }).join("");
      }

      function useOptions(selected) {
        return uses.map(function (use) {
          return "<option value=\\"" + escapeHtml(use) + "\\"" + (use === selected ? " selected" : "") + ">" + escapeHtml(use) + "</option>";
        }).join("");
      }

      function renderEvent(floor, event, index) {
        var review = eventReview(floor.floor, index);
        var node = create("article", "event" + (review.flagged ? " problem" : ""));
        node.innerHTML =
          "<div class=\\"event-head\\">" +
            "<div class=\\"badges\\">" +
              "<span class=\\"badge\\">#" + escapeHtml(index + 1) + "</span>" +
              "<span class=\\"badge kind-" + escapeHtml(event.kind || "") + "\\">" + escapeHtml(event.kind || "") + "</span>" +
              "<span class=\\"badge\\">" + escapeHtml(event.performanceUse || "") + "</span>" +
              "<span class=\\"badge\\">" + escapeHtml(event.confidence || "") + "</span>" +
              (event.speakerName || event.roleName ? "<span class=\\"badge\\">" + escapeHtml(event.speakerName || "(无说话人)") + " / " + escapeHtml(event.roleName || "(无角色)") + "</span>" : "") +
            "</div>" +
            "<button class=\\"event-flag\\">" + (review.flagged ? "取消标记" : "标记问题") + "</button>" +
          "</div>" +
          "<p><strong>summary：</strong>" + escapeHtml(event.summary || "(空)") + "</p>" +
          "<p><strong>textRef：</strong>" + escapeHtml(event.textRef || "(空)") + "</p>" +
          (event.notes ? "<p><strong>notes：</strong>" + escapeHtml(event.notes) + "</p>" : "") +
          "<div class=\\"event-review\\">" +
            "<label>建议 kind<select class=\\"suggest-kind\\"><option value=\\"\\">不修改</option>" + kindOptions(review.suggestedKind) + "</select></label>" +
            "<label>建议 performanceUse<select class=\\"suggest-use\\"><option value=\\"\\">不修改</option>" + useOptions(review.suggestedUse) + "</select></label>" +
            "<textarea class=\\"event-note\\" placeholder=\\"记录问题和修改建议\\">" + escapeHtml(review.note || "") + "</textarea>" +
          "</div>";
        node.querySelector(".event-flag").addEventListener("click", function () {
          setEventReview(floor.floor, index, { flagged: !review.flagged });
        });
        node.querySelector(".suggest-kind").addEventListener("change", function (evt) {
          setEventReview(floor.floor, index, { suggestedKind: evt.target.value });
        });
        node.querySelector(".suggest-use").addEventListener("change", function (evt) {
          setEventReview(floor.floor, index, { suggestedUse: evt.target.value });
        });
        node.querySelector(".event-note").addEventListener("input", debounce(function (evt) {
          setEventReview(floor.floor, index, { note: evt.target.value, flagged: true });
        }, 250));
        return node;
      }

      function renderSource(raw) {
        var wrapper = create("div", "source-rendered");
        if (!raw) {
          wrapper.appendChild(create("div", "empty", "源文缺失"));
          return wrapper;
        }
        raw.split("\\n").forEach(function (line) {
          if (!line.trim()) return;
          var imageMatch = line.match(/^!\\[[^\\]]*\\]\\(([^)]+)\\)/);
          if (imageMatch) {
            var img = document.createElement("img");
            img.src = imageMatch[1];
            img.alt = "source image";
            img.loading = "lazy";
            img.addEventListener("click", function () {
              window.open(img.src, "_blank");
            });
            wrapper.appendChild(img);
            return;
          }
          if (line.indexOf("## ") === 0) {
            wrapper.appendChild(create("h2", "", line.replace(/^##\\s*/, "")));
            return;
          }
          if (line.indexOf(">") === 0) {
            wrapper.appendChild(create("blockquote", "", line.replace(/^>\\s*/, "")));
            return;
          }
          wrapper.appendChild(create("p", "", line));
        });
        return wrapper;
      }

      function renderDetail() {
        el.detail.innerHTML = "";
        var floor = floors.find(function (item) { return item.floor === selectedFloor; });
        if (!floor) {
          el.detail.appendChild(create("div", "empty", "没有选中楼层"));
          return;
        }
        var review = floorReview(floor.floor);
        var head = create("section", "floor-head");
        head.innerHTML =
          "<h2>第 " + escapeHtml(floor.floor) + " 楼</h2>" +
          "<p>" + escapeHtml(floor.summary || "(无摘要)") + "</p>" +
          (floor.notes ? "<p class=\\"muted\\">notes: " + escapeHtml(floor.notes) + "</p>" : "") +
          "<div class=\\"meta-grid\\">" +
            "<div class=\\"meta-cell\\"><span class=\\"small muted\\">part</span><br>" + escapeHtml(floor.partName || "(无)") + "</div>" +
            "<div class=\\"meta-cell\\"><span class=\\"small muted\\">time</span><br>" + escapeHtml(floor.sourceTime || "(无)") + "</div>" +
            "<div class=\\"meta-cell\\"><span class=\\"small muted\\">status</span><br>" + escapeHtml(floor.status || "(无)") + "</div>" +
            "<div class=\\"meta-cell\\"><span class=\\"small muted\\">events</span><br>" + escapeHtml((floor.events || []).length) + "</div>" +
          "</div>";

        var reviewBox = create("div", "review-box");
        var statusButtons = create("div", "segmented");
        [
          ["unreviewed", "未审"],
          ["ok", "通过"],
          ["problem", "有问题"],
          ["skip", "暂跳过"]
        ].forEach(function (item) {
          var button = create("button", item[0] === review.status ? "active" : "", item[1]);
          button.addEventListener("click", function () {
            setFloorReview(floor.floor, { status: item[0] });
          });
          statusButtons.appendChild(button);
        });
        var note = document.createElement("textarea");
        note.placeholder = "本楼审查意见";
        note.value = review.note || "";
        note.addEventListener("input", debounce(function (evt) {
          setFloorReview(floor.floor, { note: evt.target.value });
        }, 250));
        reviewBox.appendChild(statusButtons);
        reviewBox.appendChild(note);
        head.appendChild(reviewBox);
        el.detail.appendChild(head);

        var eventList = create("section", "event-list");
        (floor.events || []).forEach(function (event, index) {
          eventList.appendChild(renderEvent(floor, event, index));
        });
        if (!(floor.events || []).length) eventList.appendChild(create("div", "empty", "本楼没有分类事件"));
        el.detail.appendChild(eventList);

        var tabs = create("div", "source-tabs");
        var renderedButton = create("button", sourceMode === "rendered" ? "active" : "", "渲染原文");
        var rawButton = create("button", sourceMode === "raw" ? "active" : "", "Markdown 原文");
        renderedButton.addEventListener("click", function () {
          sourceMode = "rendered";
          renderDetail();
        });
        rawButton.addEventListener("click", function () {
          sourceMode = "raw";
          renderDetail();
        });
        tabs.appendChild(renderedButton);
        tabs.appendChild(rawButton);
        el.detail.appendChild(tabs);

        var source = create("section", "source");
        if (sourceMode === "raw") {
          var pre = document.createElement("pre");
          pre.textContent = floor.raw || "(源文缺失)";
          source.appendChild(pre);
        }
        else {
          var body = create("div", "source-body");
          body.appendChild(renderSource(floor.raw));
          source.appendChild(body);
        }
        el.detail.appendChild(source);
      }

      function selectedIndex() {
        return filteredFloors.findIndex(function (floor) {
          return floor.floor === selectedFloor;
        });
      }

      function move(delta) {
        if (!filteredFloors.length) return;
        var index = selectedIndex();
        var nextIndex = index < 0 ? 0 : Math.max(0, Math.min(filteredFloors.length - 1, index + delta));
        selectedFloor = filteredFloors[nextIndex].floor;
        renderFloorList();
        renderDetail();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function jumpToFloor() {
        var floorNumber = Number(el.jumpInput.value);
        if (!Number.isInteger(floorNumber)) return;
        var floor = floors.find(function (item) { return item.floor === floorNumber; });
        if (!floor) return;
        selectedFloor = floor.floor;
        el.searchInput.value = "";
        el.statusFilter.value = "all";
        Array.prototype.slice.call(el.kindFilters.querySelectorAll("input")).forEach(function (input) {
          input.checked = false;
        });
        Array.prototype.slice.call(el.useFilters.querySelectorAll("input")).forEach(function (input) {
          input.checked = false;
        });
        applyFilters();
      }

      function exportReviews() {
        var output = {
          exportedAt: new Date().toISOString(),
          sourceRoot: data.sourceRoot,
          generatedAt: data.generatedAt,
          floorReviews: state.floorReviews,
          eventReviews: state.eventReviews
        };
        var blob = new Blob([JSON.stringify(output, null, 2) + "\\n"], { type: "application/json;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "gululu-text-review-notes-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      }

      function importReviews(file) {
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var parsed = JSON.parse(String(reader.result || "{}"));
            state.floorReviews = parsed.floorReviews || {};
            state.eventReviews = parsed.eventReviews || {};
            saveState();
            applyFilters();
          }
          catch (error) {
            alert("导入失败：" + error.message);
          }
        };
        reader.readAsText(file, "utf-8");
      }

      function debounce(fn, wait) {
        var timer = null;
        return function () {
          var args = arguments;
          clearTimeout(timer);
          timer = setTimeout(function () {
            fn.apply(null, args);
          }, wait);
        };
      }

      function bindEvents() {
        el.searchInput.addEventListener("input", debounce(applyFilters, 200));
        el.statusFilter.addEventListener("change", applyFilters);
        el.jumpButton.addEventListener("click", jumpToFloor);
        el.jumpInput.addEventListener("keydown", function (evt) {
          if (evt.key === "Enter") jumpToFloor();
        });
        el.prevButton.addEventListener("click", function () { move(-1); });
        el.nextButton.addEventListener("click", function () { move(1); });
        el.exportButton.addEventListener("click", exportReviews);
        el.importButton.addEventListener("click", function () { el.importFile.click(); });
        el.importFile.addEventListener("change", function () {
          if (el.importFile.files && el.importFile.files[0]) importReviews(el.importFile.files[0]);
          el.importFile.value = "";
        });
        el.clearButton.addEventListener("click", function () {
          if (!confirm("清空本地审查意见？")) return;
          state = { eventReviews: {}, floorReviews: {} };
          saveState();
          applyFilters();
        });
        document.addEventListener("keydown", function (evt) {
          var tag = document.activeElement && document.activeElement.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
          if (evt.key === "j" || evt.key === "J") move(1);
          if (evt.key === "k" || evt.key === "K") move(-1);
          if (evt.key === "1" && selectedFloor != null) setFloorReview(selectedFloor, { status: "ok" });
          if (evt.key === "2" && selectedFloor != null) setFloorReview(selectedFloor, { status: "problem" });
          if (evt.key === "3" && selectedFloor != null) setFloorReview(selectedFloor, { status: "skip" });
        });
      }

      function init() {
        renderFilterChips(el.kindFilters, kinds, "kind-");
        renderFilterChips(el.useFilters, uses, "use-");
        bindEvents();
        updateStats();
        renderFloorList();
        renderDetail();
      }

      init();
    })();
  </script>
</body>
</html>
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const store = await readJson(path.join(args.outDir, "floor-classifications.json"));
  const sources = await readSourceFloors(args.root);
  const data = buildData({ root: args.root, sources, store });
  await writeText(args.htmlPath, renderHtml(data));
  console.log(JSON.stringify({
    events: data.stats.eventCount,
    floors: data.stats.floorCount,
    html: args.htmlPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
