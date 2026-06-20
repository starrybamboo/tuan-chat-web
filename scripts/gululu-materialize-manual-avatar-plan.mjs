#!/usr/bin/env node

import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const DEFAULT_ROOT = "D:\\gululu-cache\\output\\opus-88-owner-only-refetch-v3";
const IMAGE_EXTENSIONS = new Set([".png"]);

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
  if (!args.has("plan"))
    throw new Error("缺少 --plan <manual-plan.json>");
  return {
    dryRun: args.has("dry-run"),
    force: args.has("force"),
    plan: path.resolve(args.get("plan")),
    root: path.resolve(args.get("root") ?? DEFAULT_ROOT),
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

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  }
  catch {
    return false;
  }
}

function splitPipe(value) {
  return String(value ?? "").split("|").map(item => item.trim()).filter(Boolean);
}

function toRelPath(file, root) {
  return path.relative(root, file).replaceAll("\\", "/");
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
    .slice(0, 80);
  return cleaned || fallback;
}

function normalizeUsageKey(value, fallback = "uncertain_avatar") {
  return sanitizeToken(String(value ?? "").replace(/__v\d+$/i, ""), fallback);
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

async function checkerSvg(width, height, size = 12) {
  return sharp(Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="c" width="${size * 2}" height="${size * 2}" patternUnits="userSpaceOnUse"><rect width="${size}" height="${size}" fill="#eeeeee"/><rect x="${size}" y="${size}" width="${size}" height="${size}" fill="#eeeeee"/><rect x="${size}" width="${size}" height="${size}" fill="#ffffff"/><rect y="${size}" width="${size}" height="${size}" fill="#ffffff"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`)).png().toBuffer();
}

async function alphaExtrema(file) {
  const stats = await sharp(file, { failOn: "none" })
    .ensureAlpha()
    .extractChannel("alpha")
    .stats();
  const channel = stats.channels[0];
  return [channel.min, channel.max];
}

async function readPlan(planPath) {
  const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
  const planDir = path.dirname(planPath);
  if (plan.sourceList) {
    const sourceListPath = path.resolve(planDir, plan.sourceList);
    const sourceJobs = JSON.parse(await fs.readFile(sourceListPath, "utf8"));
    const sourceByKey = new Map(sourceJobs.map(job => [`${job.role}\u0000${job.assetKind}`, job]));
    plan.jobs = plan.jobs.map((job) => {
      const source = sourceByKey.get(`${job.sourceRole ?? job.role}\u0000${job.assetKind}`);
      if (!source)
        throw new Error(`plan job 没有匹配 sourceList: ${job.role}/${job.assetKind}`);
      return {
        ...source,
        ...job,
        files: [...source.files, ...(job.additionalFiles ?? [])],
        sourceRole: job.sourceRole ?? source.role,
      };
    });
  }
  return plan;
}

async function readIndexRows(finalRoot) {
  const indexPath = path.join(finalRoot, "index.csv");
  const rows = parseCsv(await fs.readFile(indexPath, "utf8"));
  return new Map(rows.map(row => [row.outputRelPath.replaceAll("\\", "/"), row]));
}

async function buildItems({ files, finalRoot, indexRows }) {
  const items = [];
  for (let index = 0; index < files.length; index += 1) {
    const absPath = path.resolve(files[index]);
    if (!IMAGE_EXTENSIONS.has(path.extname(absPath).toLowerCase()))
      throw new Error(`只支持 PNG 素材: ${absPath}`);
    const finalOutputRelPath = toRelPath(absPath, finalRoot);
    const row = indexRows.get(finalOutputRelPath) ?? {};
    const stat = await fs.stat(absPath);
    const meta = await sharp(absPath, { failOn: "none" }).metadata();
    const data = await fs.readFile(absPath);
    items.push({
      absPath,
      aggregatedSourceRelPaths: splitPipe(row.aggregatedSourceRelPaths),
      alphaExtrema: await alphaExtrema(absPath),
      bytes: stat.size,
      fileName: path.basename(absPath),
      finalOutputRelPath,
      height: meta.height,
      id: `I${String(index + 1).padStart(3, "0")}`,
      sha256: crypto.createHash("sha256").update(data).digest("hex"),
      sourceRelPath: row.sourceRelPath || "",
      sourceRoleDir: row.character || path.basename(path.dirname(path.dirname(absPath))),
      width: meta.width,
    });
  }
  return items;
}

async function ensureCleanDir(dir, allowedRoot) {
  const resolved = path.resolve(dir);
  const allowed = path.resolve(allowedRoot);
  if (!resolved.startsWith(allowed))
    throw new Error(`拒绝清理输出根之外的目录: ${dir}`);
  await fs.rm(resolved, { recursive: true, force: true });
  await fs.mkdir(resolved, { recursive: true });
}

async function backupExistingDir(dir, backupRoot) {
  if (!await pathExists(dir))
    return "";
  const backupDir = path.join(backupRoot, path.basename(dir));
  await ensureCleanDir(backupDir, backupRoot);
  await fs.cp(dir, backupDir, { recursive: true });
  return backupDir;
}

function stateFromGroup(group) {
  return {
    affect: sanitizeToken(group.affect ?? group.emotion, "uncertain"),
    blush: sanitizeToken(group.blush, "none"),
    emotion: sanitizeToken(group.emotion, "uncertain"),
    eyes: sanitizeToken(group.eyes, "unknown"),
    gaze: sanitizeToken(group.gaze, "unknown"),
    mouth: sanitizeToken(group.mouth, "unknown"),
    pose: sanitizeToken(group.pose, "front"),
    shadow: sanitizeToken(group.shadow, "none"),
    sweat: sanitizeToken(group.sweat, "none"),
    tears: sanitizeToken(group.tears, "none"),
    wound: sanitizeToken(group.wound, "none"),
  };
}

function validateGroups(job, items) {
  const byId = new Map(items.map(item => [item.id, item]));
  const seen = new Set();
  for (const group of job.groups) {
    if (!Array.isArray(group.memberIds) || group.memberIds.length === 0)
      throw new Error(`${job.role}/${job.assetKind} 存在空分组`);
    if (!group.memberIds.includes(group.representativeId))
      throw new Error(`${job.role}/${job.assetKind} representativeId 不在 memberIds: ${group.representativeId}`);
    for (const id of group.memberIds) {
      if (!byId.has(id))
        throw new Error(`${job.role}/${job.assetKind} 未知 memberId: ${id}`);
      if (seen.has(id))
        throw new Error(`${job.role}/${job.assetKind} memberId 重复出现: ${id}`);
      seen.add(id);
    }
  }
  const missing = items.filter(item => !seen.has(item.id)).map(item => item.id);
  if (missing.length)
    throw new Error(`${job.role}/${job.assetKind} 分组漏项: ${missing.join(", ")}`);
}

async function writeSheet(outPath, items, imagePathForItem, labelForItem) {
  const cellW = 210;
  const imgH = 180;
  const labelH = 60;
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
      input: await sharp(imagePathForItem(item), { failOn: "none" })
        .rotate()
        .resize({ width: cellW, height: imgH, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
      left,
      top,
    });
    const label = labelForItem(item);
    composites.push({
      input: Buffer.from(`<svg width="${cellW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f6f6f6"/><text x="6" y="17" font-family="Arial, sans-serif" font-size="12" fill="#111">${escapeXml(label[0] ?? "").slice(0, 42)}</text><text x="6" y="35" font-family="Arial, sans-serif" font-size="10" fill="#555">${escapeXml(label[1] ?? "").slice(0, 48)}</text><text x="6" y="51" font-family="Arial, sans-serif" font-size="10" fill="#777">${escapeXml(label[2] ?? "").slice(0, 48)}</text></svg>`),
      left,
      top: top + imgH,
    });
  }
  await sharp({ create: { width, height, channels: 4, background: "#ffffff" } })
    .composite(composites)
    .png()
    .toFile(outPath);
}

async function writeCsv(outPath, rows) {
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
    "groupedIds",
    "emotion",
    "eyes",
    "mouth",
    "blush",
    "shadow",
    "reviewStatus",
    "collapseReason",
  ];
  await fs.writeFile(outPath, `${toCsv(rows, columns)}\n`, "utf8");
}

async function materializeJob({ args, finalRoot, indexRows, job, plan, reportRoot }) {
  const role = job.outputRole ?? job.role;
  const outDir = path.join(finalRoot, "named-avatars", role, job.assetKind);
  const items = await buildItems({ files: job.files, finalRoot, indexRows });
  validateGroups(job, items);
  const byId = new Map(items.map(item => [item.id, item]));
  const reportDir = path.join(reportRoot, role, job.assetKind);
  const backupRoot = path.join(reportDir, `before-manual-plan-${plan.runId}`);
  if (args.dryRun) {
    return { assetKind: job.assetKind, dryRun: true, role, sourceCount: items.length, target: outDir };
  }
  if (!args.force && await pathExists(outDir))
    throw new Error(`目标目录已存在，拒绝覆盖；确认要重跑请加 --force: ${outDir}`);
  await fs.mkdir(reportDir, { recursive: true });
  await backupExistingDir(outDir, backupRoot);
  for (const legacy of job.archiveLegacyNamedDirs ?? []) {
    const legacyDir = path.join(finalRoot, "named-avatars", ...legacy.split(/[\\/]+/));
    const legacyBackup = path.join(backupRoot, "legacy", ...legacy.split(/[\\/]+/));
    if (await pathExists(legacyDir)) {
      await fs.mkdir(path.dirname(legacyBackup), { recursive: true });
      await fs.cp(legacyDir, legacyBackup, { recursive: true });
      await fs.rm(legacyDir, { recursive: true, force: true });
      const legacyRoleDir = path.dirname(legacyDir);
      if ((await fs.readdir(legacyRoleDir).catch(() => [])).length === 0)
        await fs.rm(legacyRoleDir, { recursive: true, force: true });
    }
  }
  await ensureCleanDir(outDir, path.join(finalRoot, "named-avatars"));
  await fs.mkdir(path.join(outDir, "_interchangeable"), { recursive: true });
  await writeSheet(
    path.join(reportDir, `all-source-${items.length}-sheet.png`),
    items,
    item => item.absPath,
    item => [`${item.id} ${role}`, item.fileName, `${item.width ?? "?"}x${item.height ?? "?"}`],
  );

  const usageCounts = new Map();
  const manifestItems = [];
  const csvRows = [];
  for (const group of job.groups) {
    const representative = byId.get(group.representativeId);
    const stateSignature = stateFromGroup(group);
    const base = normalizeUsageKey(group.usageKey, job.assetKind === "manga-avatar" ? "uncertain_manga" : "uncertain_avatar");
    const count = (usageCounts.get(base) ?? 0) + 1;
    usageCounts.set(base, count);
    const versionedUsageKey = `${base}__v${String(count).padStart(3, "0")}`;
    const file = `${versionedUsageKey}.png`;
    await fs.copyFile(representative.absPath, path.join(outDir, file));
    const groupDir = path.join(outDir, "_interchangeable", versionedUsageKey);
    await fs.mkdir(groupDir, { recursive: true });
    const members = [];
    for (const id of group.memberIds) {
      const member = byId.get(id);
      const prefix = id === representative.id ? "KEEP" : "ALT";
      await fs.copyFile(member.absPath, path.join(groupDir, `${prefix}__${id}__${member.fileName}`));
      const sourceCandidates = await copySourceCandidates({ groupDir, id, member, prefix, root: args.root });
      members.push({
        id,
        fileName: member.fileName,
        finalOutputRelPath: member.finalOutputRelPath,
        sourceRelPath: member.sourceRelPath,
        aggregatedSourceRelPaths: member.aggregatedSourceRelPaths,
        sourceCandidateCount: sourceCandidates.filter(candidate => candidate.copied).length,
        sourceCandidates,
        sha256: member.sha256,
        width: member.width,
        height: member.height,
        alphaExtrema: member.alphaExtrema,
        stateSignature,
        collapsedInto: file,
        collapseReason: group.reason,
      });
    }
    const entry = {
      file,
      usageKey: base,
      versionedUsageKey,
      displayName: group.displayName,
      role,
      assetKind: job.assetKind,
      ...stateSignature,
      confidence: 1,
      reviewStatus: plan.reviewStatus ?? "manual-five-six-image",
      namingSource: plan.namingSource ?? "manual-review-2026-06-07-five-six-image",
      interchangeableGroupId: versionedUsageKey,
      representativeId: representative.id,
      representativeOriginalFile: representative.fileName,
      representativeSourceRelPath: representative.sourceRelPath,
      representativeFinalOutputRelPath: representative.finalOutputRelPath,
      representativeSha256: representative.sha256,
      memberCount: members.length,
      sourceCandidateCount: members.reduce((sum, member) => sum + member.sourceCandidateCount, 0),
      collapseReason: group.reason,
      members,
    };
    manifestItems.push(entry);
    csvRows.push({
      file,
      usageKey: base,
      versionedUsageKey,
      displayName: group.displayName,
      assetKind: job.assetKind,
      representativeId: representative.id,
      representativeOriginalFile: representative.fileName,
      representativeSourceRelPath: representative.sourceRelPath,
      memberCount: members.length,
      sourceCandidateCount: entry.sourceCandidateCount,
      groupedIds: group.memberIds.join("|"),
      emotion: stateSignature.emotion,
      eyes: stateSignature.eyes,
      mouth: stateSignature.mouth,
      blush: stateSignature.blush,
      shadow: stateSignature.shadow,
      reviewStatus: plan.reviewStatus ?? "manual-five-six-image",
      collapseReason: group.reason,
    });
    await fs.writeFile(path.join(groupDir, "group.json"), JSON.stringify(entry, null, 2), "utf8");
  }

  const sourceRoleDirs = [...new Set([job.sourceRole, job.role, ...(job.sourceRoleDirs ?? []), ...items.map(item => item.sourceRoleDir)].filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
  const manifest = {
    role,
    sourceRoleDirs,
    assetKind: job.assetKind,
    generatedAt: new Date().toISOString(),
    source: plan.source ?? "manual-five-six-image",
    count: manifestItems.length,
    sourceCount: items.length,
    collapsedFromCount: items.length,
    interchangeablePolicy: plan.interchangeablePolicy ?? "manual-safe five-six-image review; visible state differences stay separate",
    items: manifestItems,
  };
  await fs.writeFile(path.join(outDir, "avatar-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  await writeCsv(path.join(outDir, "avatar-manifest.csv"), csvRows);
  await fs.writeFile(path.join(outDir, "README.md"), [
    `# ${role} ${job.assetKind} named avatar review`,
    "",
    "这个目录是按人工安全折叠规则生成的语义命名头像审查产物。",
    "",
    `- 角色：${role}`,
    `- 类型：${job.assetKind}`,
    `- 源图：${items.length}`,
    `- 主图：${manifestItems.length}`,
    "- `_interchangeable/` 保存 KEEP/ALT 证据、展开后的来源候选和 `group.json`。",
    "- 演出和导入脚本应读取 `avatar-manifest.json`。",
    "",
  ].join("\n"), "utf8");
  await writeSheet(
    path.join(reportDir, `final-main-${manifestItems.length}-sheet.png`),
    manifestItems,
    item => path.join(outDir, item.file),
    item => [item.versionedUsageKey, item.displayName, `${item.emotion}/${item.eyes}/${item.mouth}/${item.blush}/${item.shadow}`],
  );
  await writeSheet(
    path.join(reportDir, `final-groups-${items.length}-sheet.png`),
    items,
    item => item.absPath,
    (item) => {
      const group = manifestItems.find(entry => entry.members.some(member => member.id === item.id));
      return [`${item.id} -> ${group?.versionedUsageKey ?? "?"}`, item.fileName, group?.displayName ?? ""];
    },
  );
  return {
    assetKind: job.assetKind,
    hiddenAltCount: items.length - manifestItems.length,
    namedCount: manifestItems.length,
    role,
    sourceCount: items.length,
  };
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
  let sourceCandidateCount = 0;
  for (const roleEntry of await fs.readdir(namedRoot, { withFileTypes: true })) {
    if (!roleEntry.isDirectory())
      continue;
    const role = roleEntry.name;
    const roleSummary = {};
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
      const sourceCandidates = manifest.items.reduce((sum, item) => sum + (Number(item.sourceCandidateCount) || 0), 0);
      const groupRoot = path.join(dir, "_interchangeable");
      const groups = await pathExists(groupRoot)
        ? (await fs.readdir(groupRoot, { withFileTypes: true })).filter(entry => entry.isDirectory()).length
        : 0;
      roleSummary[assetKind] = {
        hiddenAltCount: hidden,
        interchangeableGroups: groups,
        namedCount: named,
        outputDir: dir.replaceAll("\\", "/"),
        sourceCandidateCount: sourceCandidates,
        sourceCount: source,
      };
      kindCount += 1;
      namedCount += named;
      sourceCount += source;
      hiddenAltCount += hidden;
      sourceCandidateCount += sourceCandidates;
    }
    if (Object.keys(roleSummary).length) {
      namedAvatars[role] = roleSummary;
      roleCount += 1;
    }
  }
  summary.namedAvatars = namedAvatars;
  summary.namedAvatarsTotals = { roleCount, kindCount, sourceCount, namedCount, hiddenAltCount, sourceCandidateCount };
  summary.namedAvatarsUpdatedAt = new Date().toISOString();
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  const plan = await readPlan(args.plan);
  plan.runId = plan.runId ?? new Date().toISOString().replace(/[:.]/g, "-");
  const finalRoot = path.join(args.root, "image-role-review-clean-vision-final");
  const reportRoot = path.join(finalRoot, "reports", "named-avatar-manual-fix");
  const indexRows = await readIndexRows(finalRoot);
  const results = [];
  for (const job of plan.jobs) {
    const result = await materializeJob({ args, finalRoot, indexRows, job, plan, reportRoot });
    results.push(result);
    console.log(`[manual-plan] ${result.role}/${result.assetKind} source=${result.sourceCount} named=${result.namedCount ?? "dry-run"} hidden=${result.hiddenAltCount ?? 0}`);
  }
  if (!args.dryRun)
    await updateSummary(finalRoot);
  const completed = results.filter(result => !result.dryRun).length;
  const hidden = results.reduce((sum, result) => sum + (Number(result.hiddenAltCount) || 0), 0);
  console.log(`[manual-plan] completed=${completed} hiddenAlt=${hidden}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
