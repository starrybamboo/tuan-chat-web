#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
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
  return {
    dryRun: args.has("dry-run"),
    force: args.has("force"),
    pruneOrphans: args.has("prune-orphans"),
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

function normalizeRelPath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\/+/, "");
}

function sourceAbsPath(root, sourceRelPath) {
  return path.join(root, "images", normalizeRelPath(sourceRelPath).replaceAll("/", path.sep));
}

function uniqueSourceRelPaths(member) {
  const seen = new Set();
  const result = [];
  for (const relPath of [member.sourceRelPath, ...(member.aggregatedSourceRelPaths ?? [])]) {
    const normalized = normalizeRelPath(relPath);
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

function memberId(member, item, index) {
  return String(member.id ?? member.collapsedFromId ?? item.representativeId ?? `M${String(index + 1).padStart(3, "0")}`);
}

function memberPrefix(id, item, index) {
  return id === String(item.representativeId ?? "") || index === 0 ? "KEEP" : "ALT";
}

async function listManifestPaths(finalRoot) {
  const namedRoot = path.join(finalRoot, "named-avatars");
  const manifests = [];
  for (const roleEntry of await fs.readdir(namedRoot, { withFileTypes: true })) {
    if (!roleEntry.isDirectory())
      continue;
    for (const kindEntry of await fs.readdir(path.join(namedRoot, roleEntry.name), { withFileTypes: true })) {
      if (!kindEntry.isDirectory())
        continue;
      const manifestPath = path.join(namedRoot, roleEntry.name, kindEntry.name, "avatar-manifest.json");
      if (await pathExists(manifestPath))
        manifests.push(manifestPath);
    }
  }
  return manifests.sort((left, right) => left.localeCompare(right, "zh-CN"));
}

async function copySourceCandidates({ args, groupDir, id, member, prefix }) {
  const sourceCandidates = [];
  const relPaths = uniqueSourceRelPaths(member);
  for (let index = 0; index < relPaths.length; index += 1) {
    const sourceRelPath = relPaths[index];
    const file = sourceCandidateFileName({ id, prefix, sourceIndex: index, sourceRelPath });
    const outPath = path.join(groupDir, file);
    const sourcePath = sourceAbsPath(args.root, sourceRelPath);
    const sourceExists = await pathExists(sourcePath);
    if (sourceExists && !args.dryRun && (args.force || !await pathExists(outPath)))
      await fs.copyFile(sourcePath, outPath);
    sourceCandidates.push({
      copied: sourceExists,
      file,
      sourceRelPath,
    });
  }
  return sourceCandidates;
}

async function hydrateManifest({ args, manifestPath }) {
  const dir = path.dirname(manifestPath);
  const groupRoot = path.join(dir, "_interchangeable");
  const existingGroupKeys = await pathExists(groupRoot)
    ? new Set((await fs.readdir(groupRoot, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name))
    : new Set();
  const referencedGroupKeys = new Set();
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  let groupJsonWritten = 0;
  let orphanGroupDirsPruned = 0;
  let sourceCandidateCount = 0;
  let sourceCandidateFiles = 0;
  let missingSourceFiles = 0;

  for (const item of manifest.items ?? []) {
    const groupKey = groupKeyForItem(item, existingGroupKeys);
    if (!groupKey)
      continue;
    item.interchangeableGroupId = groupKey;
    referencedGroupKeys.add(groupKey);
    const groupDir = path.join(groupRoot, groupKey);
    if (!args.dryRun)
      await fs.mkdir(groupDir, { recursive: true });
    const members = Array.isArray(item.members) ? item.members : [];
    let itemSourceCandidateCount = 0;
    for (let index = 0; index < members.length; index += 1) {
      const member = members[index];
      const id = memberId(member, item, index);
      const prefix = memberPrefix(id, item, index);
      const sourceCandidates = await copySourceCandidates({ args, groupDir, id, member, prefix });
      const copiedCount = sourceCandidates.filter(candidate => candidate.copied).length;
      missingSourceFiles += sourceCandidates.length - copiedCount;
      sourceCandidateFiles += copiedCount;
      itemSourceCandidateCount += copiedCount;
      member.sourceCandidateCount = copiedCount;
      member.sourceCandidates = sourceCandidates;
    }
    item.sourceCandidateCount = itemSourceCandidateCount;
    sourceCandidateCount += itemSourceCandidateCount;
    const groupJsonPath = path.join(groupDir, "group.json");
    if (!args.dryRun && (args.force || !await pathExists(groupJsonPath))) {
      await fs.writeFile(groupJsonPath, `${JSON.stringify(item, null, 2)}\n`, "utf8");
      groupJsonWritten += 1;
    }
  }

  if (args.pruneOrphans && await pathExists(groupRoot)) {
    const resolvedGroupRoot = path.resolve(groupRoot);
    for (const entry of await fs.readdir(groupRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || referencedGroupKeys.has(entry.name))
        continue;
      const target = path.resolve(groupRoot, entry.name);
      if (!target.startsWith(`${resolvedGroupRoot}${path.sep}`))
        throw new Error(`拒绝清理 _interchangeable 外的目录: ${target}`);
      if (!args.dryRun)
        await fs.rm(target, { recursive: true, force: true });
      orphanGroupDirsPruned += 1;
    }
  }

  manifest.sourceCandidateHydratedAt = new Date().toISOString();
  if (!args.dryRun)
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return {
    groupJsonWritten,
    manifestPath,
    missingSourceFiles,
    orphanGroupDirsPruned,
    sourceCandidateCount,
    sourceCandidateFiles,
  };
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

async function main() {
  const args = parseArgs(process.argv);
  const finalRoot = path.join(args.root, "image-role-review-clean-vision-final");
  const manifests = await listManifestPaths(finalRoot);
  let groupJsonWritten = 0;
  let orphanGroupDirsPruned = 0;
  let sourceCandidateCount = 0;
  let sourceCandidateFiles = 0;
  let missingSourceFiles = 0;
  for (const manifestPath of manifests) {
    const result = await hydrateManifest({ args, manifestPath });
    groupJsonWritten += result.groupJsonWritten;
    orphanGroupDirsPruned += result.orphanGroupDirsPruned;
    sourceCandidateCount += result.sourceCandidateCount;
    sourceCandidateFiles += result.sourceCandidateFiles;
    missingSourceFiles += result.missingSourceFiles;
  }
  if (!args.dryRun)
    await updateSummary(finalRoot);
  console.log(`[hydrate-candidates] manifests=${manifests.length} groupJsonWritten=${groupJsonWritten} orphanGroupDirsPruned=${orphanGroupDirsPruned} sourceCandidateCount=${sourceCandidateCount} sourceCandidateFiles=${sourceCandidateFiles} missingSourceFiles=${missingSourceFiles} dryRun=${args.dryRun}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
