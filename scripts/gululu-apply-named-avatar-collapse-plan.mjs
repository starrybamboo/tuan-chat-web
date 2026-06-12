#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = "D:\\gululu-cache\\output\\opus-88-owner-only-refetch-v3";

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
    throw new Error("缺少 --plan");
  return {
    dryRun: args.has("dry-run"),
    plan: path.resolve(args.get("plan")),
    root: path.resolve(args.get("root") ?? DEFAULT_ROOT),
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

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
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

function normalizeId(value) {
  return String(value ?? "").trim().toUpperCase();
}

function versionedKey(item) {
  return item.interchangeableGroupId || item.versionedUsageKey || path.basename(item.file, ".png");
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function evidenceNameWithPrefix(file, prefix) {
  const name = path.basename(file);
  if (/^(KEEP|ALT)_SOURCE__/u.test(name))
    return name.replace(/^(KEEP|ALT)_SOURCE__/u, `${prefix}_SOURCE__`);
  if (/^(KEEP|ALT)__/u.test(name))
    return name.replace(/^(KEEP|ALT)__/u, `${prefix}__`);
  return `${prefix}__${name}`;
}

async function copyIfExists(source, target) {
  if (!(await pathExists(source)))
    return false;
  if (await pathExists(target))
    return true;
  await fs.copyFile(source, target);
  return true;
}

async function copyEvidenceFiles({ fromDir, toDir, prefix }) {
  if (!(await pathExists(fromDir)))
    return [];
  const copied = [];
  for (const entry of await fs.readdir(fromDir, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === "group.json")
      continue;
    const targetName = evidenceNameWithPrefix(entry.name, prefix);
    const copiedFile = await copyIfExists(path.join(fromDir, entry.name), path.join(toDir, targetName));
    if (copiedFile)
      copied.push({ from: entry.name, to: targetName });
  }
  return copied;
}

function sourceCandidateTargetName(candidate, prefix) {
  if (!candidate?.file)
    return "";
  return evidenceNameWithPrefix(candidate.file, prefix);
}

async function copyMemberSourceCandidates({ fromDir, member, prefix, toDir }) {
  const sourceCandidates = [];
  for (const candidate of member.sourceCandidates ?? []) {
    const targetName = sourceCandidateTargetName(candidate, prefix);
    if (!targetName)
      continue;
    const copied = await copyIfExists(path.join(fromDir, candidate.file), path.join(toDir, targetName));
    sourceCandidates.push({
      ...candidate,
      copied,
      file: targetName,
    });
  }
  return sourceCandidates;
}

async function cloneMembersWithEvidence({ item, itemId, oldGroupDir, prefix, reason, targetGroupDir }) {
  const sourceMembers = Array.isArray(item.members) && item.members.length > 0
    ? item.members
    : [{ id: itemId, sourceCandidateCount: item.sourceCandidateCount, sourceCandidates: item.sourceCandidates ?? [] }];
  const members = [];
  for (const member of sourceMembers) {
    const sourceCandidates = await copyMemberSourceCandidates({
      fromDir: oldGroupDir,
      member,
      prefix,
      toDir: targetGroupDir,
    });
    members.push({
      ...member,
      collapsedFromFile: item.file,
      collapsedFromId: itemId,
      collapseReason: reason,
      sourceCandidateCount: sourceCandidates.length || Number(member.sourceCandidateCount) || 0,
      sourceCandidates,
    });
  }
  return members;
}

function groupPlansByJob(plan) {
  const groups = Array.isArray(plan.groups) ? plan.groups : [];
  const byJob = new Map();
  for (const group of groups) {
    const role = String(group.role ?? "").trim();
    const assetKind = String(group.assetKind ?? "").trim();
    const representativeId = normalizeId(group.representativeId);
    const memberIds = dedupe((group.memberIds ?? []).map(normalizeId));
    if (!role || !assetKind || !representativeId || memberIds.length < 2)
      throw new Error(`无效分组: ${JSON.stringify(group)}`);
    if (!memberIds.includes(representativeId))
      throw new Error(`代表编号必须出现在 memberIds: ${role}/${assetKind}/${representativeId}`);
    const key = `${role}\u0000${assetKind}`;
    if (!byJob.has(key))
      byJob.set(key, { assetKind, groups: [], role });
    byJob.get(key).groups.push({
      displayName: String(group.displayName ?? "").trim(),
      memberIds,
      reason: String(group.reason ?? "").trim() || "人工视觉确认：同语义状态，仅裁切/画布/线条差异。",
      representativeId,
    });
  }
  return [...byJob.values()];
}

function validateNoDuplicateMembers(jobPlan) {
  const seen = new Map();
  for (const group of jobPlan.groups) {
    for (const id of group.memberIds) {
      if (seen.has(id))
        throw new Error(`${jobPlan.role}/${jobPlan.assetKind} 中 ${id} 被重复分组: ${seen.get(id)} 与 ${group.representativeId}`);
      seen.set(id, group.representativeId);
    }
  }
}

function updateItemCounts(item) {
  const members = Array.isArray(item.members) ? item.members : [];
  item.memberCount = members.length || Number(item.memberCount) || 1;
  item.sourceCandidateCount = members.reduce((sum, member) => sum + (Number(member.sourceCandidateCount) || 0), 0);
  return item;
}

function manifestCsvRows(manifest) {
  return manifest.items.map(item => ({
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

async function writeManifestOutputs(dir, manifest) {
  manifest.count = manifest.items.length;
  manifest.sourceCount = manifest.items.reduce((sum, item) => sum + (Number(item.memberCount) || 1), 0);
  manifest.collapsedFromCount = manifest.sourceCount;
  manifest.manualVisionCollapsedAt = new Date().toISOString();
  manifest.interchangeablePolicy = "manual-vision-collapse: 当前对话视觉审查确认同语义后折叠；状态差异保留为主图。";
  await fs.writeFile(path.join(dir, "avatar-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.writeFile(
    path.join(dir, "avatar-manifest.csv"),
    `${toCsv(manifestCsvRows(manifest), [
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
    ])}\n`,
    "utf8",
  );
}

async function removeIfInside(target, allowedRoot) {
  const resolved = path.resolve(target);
  const allowed = path.resolve(allowedRoot);
  if (!resolved.startsWith(allowed))
    throw new Error(`拒绝删除目录外路径: ${target}`);
  await fs.rm(resolved, { recursive: true, force: true });
}

async function applyJobPlan({ args, finalRoot, jobPlan }) {
  validateNoDuplicateMembers(jobPlan);
  const dir = path.join(finalRoot, "named-avatars", jobPlan.role, jobPlan.assetKind);
  const manifestPath = path.join(dir, "avatar-manifest.json");
  if (!(await pathExists(manifestPath)))
    throw new Error(`缺少 manifest: ${manifestPath}`);
  const manifest = await readJson(manifestPath);
  const items = manifest.items.map((item, index) => ({ ...item, id: `I${String(index + 1).padStart(3, "0")}` }));
  const byId = new Map(items.map(item => [item.id, item]));
  const groupRoot = path.join(dir, "_interchangeable");
  const removedIds = new Set();
  const changedGroups = [];

  for (const group of jobPlan.groups) {
    const representative = byId.get(group.representativeId);
    if (!representative)
      throw new Error(`找不到代表编号: ${jobPlan.role}/${jobPlan.assetKind}/${group.representativeId}`);
    const missing = group.memberIds.filter(id => !byId.has(id));
    if (missing.length > 0)
      throw new Error(`找不到成员编号: ${jobPlan.role}/${jobPlan.assetKind}/${missing.join(",")}`);
    const targetKey = versionedKey(representative);
    const targetGroupDir = path.join(groupRoot, targetKey);
    if (!args.dryRun)
      await fs.mkdir(targetGroupDir, { recursive: true });

    const targetMembers = [];
    for (const memberId of group.memberIds) {
      const item = byId.get(memberId);
      const prefix = memberId === group.representativeId ? "KEEP" : "ALT";
      const oldGroupDir = path.join(groupRoot, versionedKey(item));
      if (!args.dryRun) {
        await copyEvidenceFiles({ fromDir: oldGroupDir, prefix, toDir: targetGroupDir });
        const evidenceFile = `${prefix}__${memberId}__${item.file}`;
        await copyIfExists(path.join(dir, item.file), path.join(targetGroupDir, evidenceFile));
      }
      const clonedMembers = args.dryRun
        ? []
        : await cloneMembersWithEvidence({
          item,
          itemId: memberId,
          oldGroupDir,
          prefix,
          reason: group.reason,
          targetGroupDir,
        });
      targetMembers.push(...(clonedMembers.length ? clonedMembers : item.members ?? []));
      if (memberId !== group.representativeId)
        removedIds.add(memberId);
    }

    representative.members = targetMembers.length ? targetMembers : representative.members;
    representative.memberCount = representative.members?.length ?? representative.memberCount;
    representative.sourceCandidateCount = (representative.members ?? [])
      .reduce((sum, member) => sum + (Number(member.sourceCandidateCount) || 0), 0);
    representative.collapseReason = group.reason;
    representative.interchangeableGroupId = targetKey;
    representative.displayName = group.displayName || representative.displayName;
    representative.manualVisionReview = {
      reviewedAt: new Date().toISOString(),
      reason: group.reason,
      source: "codex-current-chat-vision",
    };
    updateItemCounts(representative);
    if (!args.dryRun)
      await fs.writeFile(path.join(targetGroupDir, "group.json"), `${JSON.stringify(stripInternalId(representative), null, 2)}\n`, "utf8");
    changedGroups.push({
      hidden: group.memberIds.length - 1,
      memberIds: group.memberIds,
      representativeId: group.representativeId,
      targetKey,
    });
  }

  const nextItems = items
    .filter(item => !removedIds.has(item.id))
    .map(item => stripInternalId(updateItemCounts(item)));
  if (!args.dryRun) {
    for (const removedId of removedIds) {
      const item = byId.get(removedId);
      await removeIfInside(path.join(dir, item.file), dir);
      await removeIfInside(path.join(groupRoot, versionedKey(item)), groupRoot);
    }
    manifest.items = nextItems;
    await writeManifestOutputs(dir, manifest);
  }
  return {
    assetKind: jobPlan.assetKind,
    hidden: removedIds.size,
    nextCount: nextItems.length,
    previousCount: items.length,
    role: jobPlan.role,
    touchedGroups: changedGroups.length,
  };
}

function stripInternalId(item) {
  const rest = { ...item };
  delete rest.id;
  return rest;
}

async function updateSummary(finalRoot) {
  const namedRoot = path.join(finalRoot, "named-avatars");
  const summaryPath = path.join(finalRoot, "summary.json");
  const summary = await readJson(summaryPath);
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
    roleCount += 1;
    namedAvatars[role] = {};
    for (const kindEntry of await fs.readdir(path.join(namedRoot, role), { withFileTypes: true })) {
      if (!kindEntry.isDirectory())
        continue;
      const assetKind = kindEntry.name;
      const dir = path.join(namedRoot, role, assetKind);
      const manifestPath = path.join(dir, "avatar-manifest.json");
      if (!(await pathExists(manifestPath)))
        continue;
      const manifest = await readJson(manifestPath);
      const named = manifest.items.length;
      const source = manifest.items.reduce((sum, item) => sum + (Number(item.memberCount) || 1), 0);
      const sources = manifest.items.reduce((sum, item) => sum + (Number(item.sourceCandidateCount) || 0), 0);
      const groupRoot = path.join(dir, "_interchangeable");
      const groups = await pathExists(groupRoot)
        ? (await fs.readdir(groupRoot, { withFileTypes: true })).filter(entry => entry.isDirectory()).length
        : 0;
      namedAvatars[role][assetKind] = {
        hiddenAltCount: source - named,
        interchangeableGroups: groups,
        namedCount: named,
        outputDir: dir.replaceAll("\\", "/"),
        sourceCandidateCount: sources,
        sourceCount: source,
      };
      kindCount += 1;
      namedCount += named;
      sourceCount += source;
      hiddenAltCount += source - named;
      sourceCandidateCount += sources;
    }
  }
  summary.namedAvatars = namedAvatars;
  summary.namedAvatarsTotals = { roleCount, kindCount, sourceCount, namedCount, hiddenAltCount, sourceCandidateCount };
  summary.namedAvatarsUpdatedAt = new Date().toISOString();
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  const plan = await readJson(args.plan);
  const finalRoot = path.join(args.root, "image-role-review-clean-vision-final");
  const jobPlans = groupPlansByJob(plan);
  const results = [];
  for (const jobPlan of jobPlans) {
    results.push(await applyJobPlan({ args, finalRoot, jobPlan }));
  }
  if (!args.dryRun)
    await updateSummary(finalRoot);
  console.log(JSON.stringify({ dryRun: args.dryRun, results }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
