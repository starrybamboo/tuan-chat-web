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
    jsonPath: path.resolve(options.get("json") ?? path.join(outDir, "missing-bgm.json")),
    markdownPath: path.resolve(options.get("markdown") ?? path.join(outDir, "missing-bgm.md")),
    outDir,
    root,
  };
}

function cleanTitle(text) {
  return String(text ?? "")
    .replace(/^\s*BGM\s*[：:]\s*/i, "")
    .replace(/^\s*播放\s*/u, "")
    .replace(/[。；;]\s*$/u, "")
    .trim();
}

function markdownCell(text) {
  return String(text ?? "").replace(/\|/g, "\\|");
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

function collectBgmItems(store) {
  const byTitle = new Map();
  for (const floor of store.floors ?? []) {
    for (const event of floor.events ?? []) {
      if (event.kind !== "bgm") continue;
      const title = cleanTitle(event.textRef) || cleanTitle(event.summary) || "(未命名 BGM)";
      if (!byTitle.has(title)) {
        byTitle.set(title, {
          count: 0,
          floors: [],
          refs: [],
          title,
        });
      }
      const item = byTitle.get(title);
      item.count += 1;
      item.floors.push(floor.floor);
      item.refs.push({
        floor: floor.floor,
        summary: event.summary ?? "",
        textRef: event.textRef ?? "",
      });
    }
  }
  return [...byTitle.values()]
    .sort((left, right) => left.floors[0] - right.floors[0] || left.title.localeCompare(right.title, "zh-Hans-CN"));
}

function renderMarkdown({ generatedAt, items, root, totalBgmEvents }) {
  const lines = [
    "# Missing BGM 清单",
    "",
    `- sourceRoot: ${root}`,
    `- generatedAt: ${generatedAt}`,
    `- uniqueBgmCount: ${items.length}`,
    `- totalBgmEvents: ${totalBgmEvents}`,
    "",
    "| # | BGM | 次数 | 楼层 |",
    "|---:|---|---:|---|",
  ];

  items.forEach((item, index) => {
    const floors = [...new Set(item.floors)].join(", ");
    lines.push(`| ${index + 1} | ${markdownCell(item.title)} | ${item.count} | ${floors} |`);
  });

  lines.push("", "## 明细");
  for (const item of items) {
    lines.push("", `### ${item.title}`, "");
    for (const ref of item.refs) {
      lines.push(`- 第 ${ref.floor} 楼：${ref.textRef || ref.summary}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv);
  const storePath = path.join(args.outDir, "floor-classifications.json");
  const store = JSON.parse(await fs.readFile(storePath, "utf8"));
  const items = collectBgmItems(store);
  const generatedAt = new Date().toISOString();
  const totalBgmEvents = items.reduce((sum, item) => sum + item.count, 0);
  const output = {
    generatedAt,
    items,
    sourceRoot: args.root,
    totalBgmEvents,
    uniqueBgmCount: items.length,
  };

  await writeJson(args.jsonPath, output);
  await writeText(args.markdownPath, renderMarkdown({
    generatedAt,
    items,
    root: args.root,
    totalBgmEvents,
  }));

  console.log(JSON.stringify({
    json: args.jsonPath,
    markdown: args.markdownPath,
    totalBgmEvents,
    uniqueBgmCount: items.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
