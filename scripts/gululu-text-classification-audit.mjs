#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_ROOT = "D:/gululu-cache/output/opus-88-owner-only-refetch-v3";
const DEFAULT_OUT_DIR_NAME = "text-classification-manual-v1";

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
    failOnProblems: options.get("fail-on-problems") !== "false",
    outDir,
    root,
  };
}

function normalizeLineBreaks(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function countValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function duplicateValues(values) {
  return [...countValues(values).entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ count, value }))
    .sort((left, right) => left.value - right.value);
}

function difference(left, right) {
  const rightSet = new Set(right);
  return [...new Set(left)]
    .filter((value) => !rightSet.has(value))
    .sort((a, b) => a - b);
}

function sequenceMissing(values) {
  if (values.length === 0) return [];
  const valueSet = new Set(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const missing = [];
  for (let floor = min; floor <= max; floor += 1) {
    if (!valueSet.has(floor)) missing.push(floor);
  }
  return missing;
}

async function readSourceFloors(root) {
  const partsDir = path.join(root, "parts");
  const partNames = (await fs.readdir(partsDir))
    .filter((name) => name.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right));
  const floors = [];
  const byFloor = new Map();
  for (const partName of partNames) {
    const fullPath = path.join(partsDir, partName);
    const text = normalizeLineBreaks(await fs.readFile(fullPath, "utf8"));
    for (const matched of text.matchAll(/^## 第(\d+)楼/gm)) {
      const floor = Number(matched[1]);
      floors.push(floor);
      if (!byFloor.has(floor)) byFloor.set(floor, []);
      byFloor.get(floor).push(partName);
    }
  }
  return { byFloor, floors, partNames };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readPartClassifications(outDir) {
  const names = (await fs.readdir(outDir))
    .filter((name) => /^part-\d+\.classification\.json$/.test(name))
    .sort((left, right) => left.localeCompare(right));
  const floors = [];
  const fileSummaries = [];
  for (const name of names) {
    const data = await readJson(path.join(outDir, name));
    const fileFloors = Array.isArray(data.floors) ? data.floors.map((item) => Number(item.floor)) : [];
    floors.push(...fileFloors);
    fileSummaries.push({ floorCount: fileFloors.length, name });
  }
  return { fileSummaries, floors, names };
}

function validateStore(store) {
  const problems = [];
  const storeFloors = [];
  const classifiedFloors = [];
  const pendingFloors = [];
  for (const floorRecord of store.floors ?? []) {
    const floor = Number(floorRecord.floor);
    storeFloors.push(floor);
    if (floorRecord.status === "classified") classifiedFloors.push(floor);
    else pendingFloors.push(floor);

    if (!Array.isArray(floorRecord.events) || floorRecord.events.length === 0) {
      problems.push({ floor, problem: "floor has no events" });
      continue;
    }

    floorRecord.events.forEach((event, index) => {
      if (!TEXT_KINDS.has(event.kind)) {
        problems.push({ floor, index, problem: `invalid kind: ${event.kind}` });
      }
      if (!PERFORMANCE_USES.has(event.performanceUse)) {
        problems.push({ floor, index, problem: `invalid performanceUse: ${event.performanceUse}` });
      }
      if (event.confidence && !CONFIDENCE_VALUES.has(event.confidence)) {
        problems.push({ floor, index, problem: `invalid confidence: ${event.confidence}` });
      }
    });
  }
  return { classifiedFloors, pendingFloors, problems, storeFloors };
}

function buildSummary({ partClassifications, source, storeValidation }) {
  const sourceFloors = source.floors;
  const storeFloors = storeValidation.storeFloors;
  const classifiedFloors = storeValidation.classifiedFloors;
  const partFloors = partClassifications.floors;

  const missingInStore = difference(sourceFloors, classifiedFloors);
  const extraInStore = difference(classifiedFloors, sourceFloors);
  const missingInParts = difference(sourceFloors, partFloors);
  const extraInParts = difference(partFloors, sourceFloors);
  const duplicateSourceFloors = duplicateValues(sourceFloors);
  const duplicateStoreFloors = duplicateValues(storeFloors);
  const duplicatePartFloors = duplicateValues(partFloors);

  const problemCount = [
    missingInStore.length,
    extraInStore.length,
    storeValidation.pendingFloors.length,
    duplicateSourceFloors.length,
    duplicateStoreFloors.length,
    missingInParts.length,
    extraInParts.length,
    duplicatePartFloors.length,
    storeValidation.problems.length,
  ].reduce((sum, count) => sum + count, 0);

  return {
    ok: problemCount === 0,
    problemCount,
    source: {
      duplicateFloors: duplicateSourceFloors,
      floorCount: sourceFloors.length,
      maxFloor: sourceFloors.length ? Math.max(...sourceFloors) : null,
      minFloor: sourceFloors.length ? Math.min(...sourceFloors) : null,
      partFileCount: source.partNames.length,
      sequenceMissingFloors: sequenceMissing(sourceFloors),
    },
    store: {
      classifiedCount: classifiedFloors.length,
      duplicateFloors: duplicateStoreFloors,
      floorCount: storeFloors.length,
      pendingFloors: storeValidation.pendingFloors,
      validationProblems: storeValidation.problems,
    },
    comparison: {
      extraInStore,
      missingInStore,
    },
    partClassifications: {
      duplicateFloors: duplicatePartFloors,
      extraInParts,
      fileCount: partClassifications.names.length,
      fileSummaries: partClassifications.fileSummaries,
      floorRecordCount: partFloors.length,
      missingInParts,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const storePath = path.join(args.outDir, "floor-classifications.json");
  const [source, store, partClassifications] = await Promise.all([
    readSourceFloors(args.root),
    readJson(storePath),
    readPartClassifications(args.outDir),
  ]);
  const summary = buildSummary({
    partClassifications,
    source,
    storeValidation: validateStore(store),
  });
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok && args.failOnProblems) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
