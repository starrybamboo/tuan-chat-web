#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_ROOT = "D:/gululu-cache/output/opus-88-owner-only-refetch-v3";
const DEFAULT_OUT_DIR_NAME = "text-classification-manual-v1";
const SCHEMA_VERSION = "gululu-text-classification-manual-v1";

const TEXT_KINDS = new Set([
  "dialog",
  "narration",
  "dice",
  "bgm",
  "scene",
  "role_card",
  "reference",
  "author_note",
  "system",
  "unknown",
]);

const PERFORMANCE_USES = new Set([
  "perform",
  "metadata",
  "reference",
  "system",
  "review",
  "exclude",
]);

const CONFIDENCE_VALUES = new Set(["high", "medium", "low"]);

function parseArgs(argv) {
  const options = new Map();
  const positional = [];
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
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
    command: positional[0] ?? options.get("command") ?? "help",
    from: options.has("from") ? Number(options.get("from")) : undefined,
    input: options.get("input") ? path.resolve(options.get("input")) : undefined,
    outDir,
    root,
    to: options.has("to") ? Number(options.get("to")) : undefined,
  };
}

function normalizeLineBreaks(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  }
  catch {
    return false;
  }
}

async function readJsonIfExists(filePath, fallback) {
  if (!(await pathExists(filePath))) {
    return fallback;
  }
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readSourceFloors(root) {
  const partsDir = path.join(root, "parts");
  const partNames = (await fs.readdir(partsDir))
    .filter((name) => name.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right));
  const floors = new Map();
  const floorPattern = /^## 第(?<floor>\d+)楼\s*\n\s*> 时间: (?<time>[^\n]+)\s*(?<body>.*?)(?=^## 第\d+楼|(?![\s\S]))/gms;
  for (const partName of partNames) {
    const text = normalizeLineBreaks(await fs.readFile(path.join(partsDir, partName), "utf8"));
    for (const matched of text.matchAll(floorPattern)) {
      const floor = Number(matched.groups.floor);
      floors.set(floor, {
        floor,
        partName,
        sourceTime: matched.groups.time.trim(),
      });
    }
  }
  return floors;
}

function storePath(outDir) {
  return path.join(outDir, "floor-classifications.json");
}

function eventRowsPath(outDir) {
  return path.join(outDir, "events.jsonl");
}

function reviewMarkdownPath(outDir) {
  return path.join(outDir, "review.md");
}

function summaryPath(outDir) {
  return path.join(outDir, "summary.json");
}

async function loadStore(args) {
  const fallback = {
    createdAt: new Date().toISOString(),
    floors: [],
    schemaVersion: SCHEMA_VERSION,
    sourceRoot: args.root,
    taxonomy: [...TEXT_KINDS],
    updatedAt: new Date().toISOString(),
  };
  const store = await readJsonIfExists(storePath(args.outDir), fallback);
  if (store.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion: ${store.schemaVersion}`);
  }
  store.taxonomy = [...TEXT_KINDS];
  return store;
}

function validateEvent(event, floor) {
  if (!event || typeof event !== "object") {
    throw new Error(`floor ${floor}: event must be an object`);
  }
  if (!TEXT_KINDS.has(event.kind)) {
    throw new Error(`floor ${floor}: invalid event kind ${event.kind}`);
  }
  if (event.performanceUse && !PERFORMANCE_USES.has(event.performanceUse)) {
    throw new Error(`floor ${floor}: invalid performanceUse ${event.performanceUse}`);
  }
  if (event.confidence && !CONFIDENCE_VALUES.has(event.confidence)) {
    throw new Error(`floor ${floor}: invalid confidence ${event.confidence}`);
  }
}

function normalizeFloorRecord(record, sourceInfo) {
  if (!record || typeof record !== "object") {
    throw new Error("floor record must be an object");
  }
  const floor = Number(record.floor);
  if (!Number.isInteger(floor) || floor <= 0) {
    throw new Error(`invalid floor: ${record.floor}`);
  }
  const events = Array.isArray(record.events) ? record.events : [];
  for (const event of events) validateEvent(event, floor);
  return {
    events: events.map((event, index) => ({
      confidence: event.confidence ?? "high",
      kind: event.kind,
      notes: event.notes ?? "",
      performanceUse: event.performanceUse ?? defaultPerformanceUse(event.kind),
      roleName: event.roleName ?? "",
      speakerName: event.speakerName ?? "",
      summary: event.summary ?? "",
      textRef: event.textRef ?? "",
      eventIndexInFloor: event.eventIndexInFloor ?? index + 1,
    })),
    floor,
    notes: record.notes ?? "",
    partName: record.partName ?? sourceInfo?.partName ?? "",
    reviewedBy: record.reviewedBy ?? "codex-manual",
    sourceTime: record.sourceTime ?? sourceInfo?.sourceTime ?? "",
    status: record.status ?? "classified",
    summary: record.summary ?? "",
    updatedAt: new Date().toISOString(),
  };
}

function defaultPerformanceUse(kind) {
  if (kind === "system") return "system";
  if (kind === "role_card") return "reference";
  if (kind === "reference") return "reference";
  if (kind === "author_note") return "metadata";
  if (kind === "unknown") return "review";
  return "perform";
}

async function initStore(args) {
  const sourceFloors = await readSourceFloors(args.root);
  const store = await loadStore(args);
  const byFloor = new Map(store.floors.map((floor) => [floor.floor, floor]));
  for (const sourceInfo of sourceFloors.values()) {
    if (byFloor.has(sourceInfo.floor)) continue;
    byFloor.set(sourceInfo.floor, {
      events: [],
      floor: sourceInfo.floor,
      notes: "",
      partName: sourceInfo.partName,
      reviewedBy: "",
      sourceTime: sourceInfo.sourceTime,
      status: "pending",
      summary: "",
      updatedAt: "",
    });
  }
  store.floors = [...byFloor.values()].sort((left, right) => left.floor - right.floor);
  store.sourceRoot = args.root;
  store.updatedAt = new Date().toISOString();
  await writeJson(storePath(args.outDir), store);
  await writeSummaryFiles(args, store);
  console.log(`initialized ${store.floors.length} floors -> ${storePath(args.outDir)}`);
}

async function putFile(args) {
  if (!args.input) {
    throw new Error("--input is required for put-file");
  }
  const sourceFloors = await readSourceFloors(args.root);
  const store = await loadStore(args);
  const patch = JSON.parse(await fs.readFile(args.input, "utf8"));
  const incoming = Array.isArray(patch) ? patch : patch.floors;
  if (!Array.isArray(incoming)) {
    throw new Error("input must be an array or an object with floors[]");
  }
  const byFloor = new Map(store.floors.map((floor) => [floor.floor, floor]));
  for (const record of incoming) {
    const floor = Number(record.floor);
    byFloor.set(floor, normalizeFloorRecord(record, sourceFloors.get(floor)));
  }
  store.floors = [...byFloor.values()].sort((left, right) => left.floor - right.floor);
  store.sourceRoot = args.root;
  store.updatedAt = new Date().toISOString();
  await writeJson(storePath(args.outDir), store);
  await writeSummaryFiles(args, store);
  console.log(`merged ${incoming.length} floor classifications -> ${storePath(args.outDir)}`);
}

function buildSummary(store) {
  const kindCounts = {};
  const statusCounts = {};
  const performanceUseCounts = {};
  let eventCount = 0;
  for (const floor of store.floors) {
    statusCounts[floor.status] = (statusCounts[floor.status] ?? 0) + 1;
    for (const event of floor.events ?? []) {
      eventCount += 1;
      kindCounts[event.kind] = (kindCounts[event.kind] ?? 0) + 1;
      performanceUseCounts[event.performanceUse] = (performanceUseCounts[event.performanceUse] ?? 0) + 1;
    }
  }
  return {
    eventCount,
    floorCount: store.floors.length,
    kindCounts,
    performanceUseCounts,
    schemaVersion: store.schemaVersion,
    sourceRoot: store.sourceRoot,
    statusCounts,
    updatedAt: store.updatedAt,
  };
}

async function writeSummaryFiles(args, store) {
  const summary = buildSummary(store);
  await writeJson(summaryPath(args.outDir), summary);
  await fs.mkdir(args.outDir, { recursive: true });
  const rows = [];
  for (const floor of store.floors) {
    for (const event of floor.events ?? []) {
      rows.push(JSON.stringify({
        ...event,
        floor: floor.floor,
        partName: floor.partName,
        sourceTime: floor.sourceTime,
      }));
    }
  }
  await fs.writeFile(eventRowsPath(args.outDir), `${rows.join("\n")}${rows.length ? "\n" : ""}`, "utf8");
  await fs.writeFile(reviewMarkdownPath(args.outDir), renderMarkdown(store, summary), "utf8");
}

function renderMarkdown(store, summary) {
  const lines = [
    "# Gululu text classification manual review",
    "",
    `- schema: ${store.schemaVersion}`,
    `- sourceRoot: ${store.sourceRoot}`,
    `- updatedAt: ${store.updatedAt}`,
    `- floors: ${summary.floorCount}`,
    `- events: ${summary.eventCount}`,
    "",
    "## Summary",
    "",
    "```json",
    JSON.stringify({
      kindCounts: summary.kindCounts,
      performanceUseCounts: summary.performanceUseCounts,
      statusCounts: summary.statusCounts,
    }, null, 2),
    "```",
    "",
    "## Floors",
  ];
  for (const floor of store.floors.filter((item) => item.status !== "pending")) {
    lines.push("", `### Floor ${floor.floor}`, "");
    lines.push(`- part: ${floor.partName}`);
    lines.push(`- time: ${floor.sourceTime}`);
    lines.push(`- status: ${floor.status}`);
    if (floor.summary) lines.push(`- summary: ${floor.summary}`);
    if (floor.notes) lines.push(`- notes: ${floor.notes}`);
    for (const event of floor.events ?? []) {
      const speaker = event.speakerName ? ` speaker=${event.speakerName}` : "";
      const role = event.roleName ? ` role=${event.roleName}` : "";
      lines.push(`- [${event.kind}/${event.performanceUse}]${speaker}${role}: ${event.summary}`);
      if (event.textRef) lines.push(`  - text: ${event.textRef}`);
      if (event.notes) lines.push(`  - notes: ${event.notes}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function printSummary(args) {
  const store = await loadStore(args);
  await writeSummaryFiles(args, store);
  console.log(JSON.stringify(buildSummary(store), null, 2));
}

async function showFloors(args) {
  const store = await loadStore(args);
  const from = Number.isInteger(args.from) ? args.from : 1;
  const to = Number.isInteger(args.to) ? args.to : from;
  const selected = store.floors.filter((floor) => floor.floor >= from && floor.floor <= to);
  console.log(JSON.stringify(selected, null, 2));
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/gululu-text-classification-store.mjs init --root <sourceRoot>",
    "  node scripts/gululu-text-classification-store.mjs put-file --root <sourceRoot> --input <classifications.json>",
    "  node scripts/gululu-text-classification-store.mjs summary --root <sourceRoot>",
    "  node scripts/gululu-text-classification-store.mjs show --root <sourceRoot> --from 1 --to 50",
    "",
    "Input schema for put-file:",
    "  { floors: [{ floor, summary, notes, events: [{ kind, performanceUse, summary, speakerName, roleName, textRef, notes }] }] }",
    "",
    `Allowed kind: ${[...TEXT_KINDS].join(", ")}`,
    `Allowed performanceUse: ${[...PERFORMANCE_USES].join(", ")}`,
  ].join("\n"));
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.command === "help" || args.command === "--help") {
    printHelp();
    return;
  }
  if (args.command === "init") {
    await initStore(args);
    return;
  }
  if (args.command === "put-file") {
    await putFile(args);
    return;
  }
  if (args.command === "summary") {
    await printSummary(args);
    return;
  }
  if (args.command === "show") {
    await showFloors(args);
    return;
  }
  throw new Error(`Unknown command: ${args.command}`);
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
