#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_ROOT = "D:/gululu-cache/output/opus-88-owner-only-refetch-v3";
const DEFAULT_OUT_DIR_NAME = "text-classification-manual-v1";
const DEFAULT_AUDIT_DIR_NAME = "human-audit";

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
    auditDir: path.resolve(options.get("audit-dir") ?? path.join(outDir, DEFAULT_AUDIT_DIR_NAME)),
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

function cleanForMarkdown(text) {
  return String(text ?? "").trim() || "(空)";
}

function fenceText(text) {
  return normalizeLineBreaks(text).replace(/```/g, "``\u200b`");
}

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

async function readSourceFloors(root) {
  const partsDir = path.join(root, "parts");
  const partNames = (await fs.readdir(partsDir))
    .filter((name) => name.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right));
  const byFloor = new Map();
  const byPart = new Map();
  for (const partName of partNames) {
    const text = normalizeLineBreaks(await fs.readFile(path.join(partsDir, partName), "utf8"));
    const matches = [...text.matchAll(/^## 第(\d+)楼/gm)];
    const floors = [];
    matches.forEach((matched, index) => {
      const floor = Number(matched[1]);
      const start = matched.index;
      const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
      const raw = text.slice(start, end).trim();
      const sourceTime = raw.match(/^> 时间:\s*(.+)$/m)?.[1]?.trim() ?? "";
      const source = { floor, partName, raw, sourceTime };
      floors.push(source);
      byFloor.set(floor, source);
    });
    byPart.set(partName, floors);
  }
  return { byFloor, byPart, partNames };
}

function buildPartFileName(partName) {
  const matched = partName.match(/^(part-\d+)/);
  return `${matched?.[1] ?? path.basename(partName, ".md")}.md`;
}

function renderEvent(event, index) {
  const speaker = event.speakerName || event.roleName
    ? ` speaker=${event.speakerName || "(无)"} role=${event.roleName || "(无)"}`
    : "";
  const lines = [
    `${index + 1}. \`${event.kind}/${event.performanceUse ?? ""}/${event.confidence ?? ""}\`${speaker}`,
    `   - summary: ${cleanForMarkdown(event.summary)}`,
    `   - textRef: ${cleanForMarkdown(event.textRef)}`,
  ];
  if (event.battleId) {
    lines.push(`   - battle: ${[
      event.battleId,
      event.battlePhase,
      event.battleTitle,
      event.battleSide,
    ].filter(Boolean).join(" / ")}`);
  }
  if (event.notes) lines.push(`   - notes: ${cleanForMarkdown(event.notes)}`);
  return lines.join("\n");
}

function renderFloor(floorRecord, source) {
  const lines = [
    `## 第${floorRecord.floor}楼`,
    "",
    `- sourcePart: ${source?.partName ?? floorRecord.partName ?? "(缺失)"}`,
    `- time: ${floorRecord.sourceTime || source?.sourceTime || "(无)"}`,
    `- status: ${floorRecord.status ?? "(无)"}`,
    `- summary: ${cleanForMarkdown(floorRecord.summary)}`,
  ];
  if (floorRecord.notes) lines.push(`- notes: ${cleanForMarkdown(floorRecord.notes)}`);

  lines.push("", "### 分类事件", "");
  const events = Array.isArray(floorRecord.events) ? floorRecord.events : [];
  if (events.length === 0) {
    lines.push("(无事件)");
  }
  else {
    events.forEach((event, index) => lines.push(renderEvent(event, index), ""));
  }

  lines.push("### 原文", "", "```markdown", fenceText(source?.raw ?? "(源文缺失)"), "```", "");
  return lines.join("\n");
}

function renderPart({ floors, partName, root }) {
  const lines = [
    `# ${partName} 人工审计`,
    "",
    `- sourceRoot: ${root}`,
    `- floors: ${floors.length}`,
    "- 返回索引：[README.md](README.md)",
    "",
  ];
  for (const item of floors) lines.push(renderFloor(item.floorRecord, item.source));
  return `${lines.join("\n")}\n`;
}

function renderAttention(attentionItems) {
  const lines = [
    "# 需要优先复核的分类",
    "",
    "这里收集 `unknown`、非 high confidence、`review` 用途或无事件楼层；为空表示没有这类自动标记。",
    "",
  ];
  if (attentionItems.length === 0) {
    lines.push("无。", "");
    return lines.join("\n");
  }
  for (const item of attentionItems) {
    lines.push(
      `- 第 ${item.floor} 楼：${item.reason}，见 [${item.partAuditFile}](${item.partAuditFile}#第${item.floor}楼)`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function renderIndex({ attentionItems, generatedAt, partAudits, root, summary }) {
  const lines = [
    "# Gululu 文本清洗人工审计包",
    "",
    `- sourceRoot: ${root}`,
    `- generatedAt: ${generatedAt}`,
    `- floors: ${summary.floorCount}`,
    `- events: ${summary.eventCount}`,
    `- attentionItems: ${attentionItems.length}`,
    "",
    "## 分类统计",
    "",
    "### kindCounts",
    "",
    "```json",
    JSON.stringify(summary.kindCounts, null, 2),
    "```",
    "",
    "### performanceUseCounts",
    "",
    "```json",
    JSON.stringify(summary.performanceUseCounts, null, 2),
    "```",
    "",
    "## 审计方式",
    "",
    "逐个打开下面的 part 文件。每楼先看“分类事件”，再对照“原文”代码块；若分类不合适，记录楼层号、事件序号、建议 kind/performanceUse 和理由。",
    "",
    "- 优先复核：[attention.md](attention.md)",
    "- 原始总表：../floor-classifications.json",
    "- 机器事件流：../events.jsonl",
    "- 汇总审阅版：../review.md",
    "",
    "## 分包索引",
    "",
  ];
  for (const part of partAudits) {
    const range = part.floors.length
      ? `第 ${part.floors[0]}-${part.floors[part.floors.length - 1]} 楼`
      : "无楼层";
    lines.push(`- [${part.fileName}](${part.fileName})：${part.partName}，${range}，${part.floors.length} 楼`);
  }
  lines.push("");
  return lines.join("\n");
}

function shouldFlagFloor(floorRecord) {
  const events = Array.isArray(floorRecord.events) ? floorRecord.events : [];
  if (events.length === 0) return "无事件";
  const reasons = [];
  for (const event of events) {
    if (event.kind === "unknown") reasons.push("unknown");
    if (event.confidence && event.confidence !== "high") reasons.push(`confidence=${event.confidence}`);
    if (event.performanceUse === "review") reasons.push("performanceUse=review");
  }
  return [...new Set(reasons)].join(", ");
}

async function main() {
  const args = parseArgs(process.argv);
  const store = await readJson(path.join(args.outDir, "floor-classifications.json"));
  const source = await readSourceFloors(args.root);
  const byFloor = new Map((store.floors ?? []).map((floorRecord) => [Number(floorRecord.floor), floorRecord]));
  const generatedAt = new Date().toISOString();
  const eventRecords = (store.floors ?? []).flatMap((floor) => floor.events ?? []);
  const summary = {
    eventCount: eventRecords.length,
    floorCount: store.floors?.length ?? 0,
    kindCounts: countBy(eventRecords.map((event) => event.kind)),
    performanceUseCounts: countBy(eventRecords.map((event) => event.performanceUse)),
  };

  await fs.rm(args.auditDir, { force: true, recursive: true });
  await fs.mkdir(args.auditDir, { recursive: true });

  const attentionItems = [];
  const partAudits = [];
  for (const partName of source.partNames) {
    const partFileName = buildPartFileName(partName);
    const partSources = source.byPart.get(partName) ?? [];
    const floors = partSources
      .map((sourceFloor) => ({
        floor: sourceFloor.floor,
        floorRecord: byFloor.get(sourceFloor.floor),
        source: sourceFloor,
      }))
      .filter((item) => item.floorRecord);

    for (const item of floors) {
      const reason = shouldFlagFloor(item.floorRecord);
      if (reason) attentionItems.push({ floor: item.floor, partAuditFile: partFileName, reason });
    }

    await writeText(path.join(args.auditDir, partFileName), renderPart({
      floors,
      partFileName,
      partName,
      root: args.root,
    }));
    partAudits.push({
      fileName: partFileName,
      floors: floors.map((item) => item.floor),
      partName,
    });
  }

  await writeText(path.join(args.auditDir, "attention.md"), renderAttention(attentionItems));
  await writeText(path.join(args.auditDir, "README.md"), renderIndex({
    attentionItems,
    generatedAt,
    partAudits,
    root: args.root,
    summary,
  }));

  console.log(JSON.stringify({
    auditDir: args.auditDir,
    attentionItems: attentionItems.length,
    files: partAudits.length + 2,
    floors: summary.floorCount,
    events: summary.eventCount,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
