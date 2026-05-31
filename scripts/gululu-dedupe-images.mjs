import { createHash } from "node:crypto";
import { link, readdir, readFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_SOURCE_ROOT = "D:/gululu-cache/output/opus-88-owner-only-refetch-v3";
const IMAGE_EXTENSIONS = new Set([".bmp", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);

function parseArgs(argv) {
  const args = {
    apply: false,
    root: DEFAULT_SOURCE_ROOT,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--root") {
      args.root = argv[++index];
    }
    else if (arg === "--apply") {
      args.apply = true;
    }
    else {
      throw new Error(`未知参数: ${arg}`);
    }
  }
  return args;
}

function toSlashPath(value) {
  return value.replace(/\\/g, "/");
}

async function collectImages(dir, rootDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectImages(absolutePath, rootDir));
      continue;
    }
    if (!entry.isFile() || !IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }
    files.push({
      absolutePath,
      relPath: toSlashPath(path.relative(rootDir, absolutePath)),
    });
  }
  return files;
}

async function sha256File(filePath) {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

async function areSameFile(leftPath, rightPath) {
  const [left, right] = await Promise.all([stat(leftPath), stat(rightPath)]);
  return left.dev === right.dev && left.ino === right.ino;
}

function chooseCanonical(files) {
  return [...files].sort((left, right) => {
    return left.relPath.localeCompare(right.relPath, "zh-Hans-CN");
  })[0];
}

async function replaceWithHardlink(canonicalPath, duplicatePath) {
  if (await areSameFile(canonicalPath, duplicatePath)) {
    return "already-linked";
  }

  const tempPath = `${duplicatePath}.dedupe-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await rename(duplicatePath, tempPath);
  try {
    await link(canonicalPath, duplicatePath);
    await unlink(tempPath);
    return "linked";
  }
  catch (error) {
    await rename(tempPath, duplicatePath);
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceRoot = path.resolve(args.root);
  const imagesDir = path.join(sourceRoot, "images");
  const files = await collectImages(imagesDir);

  const byHash = new Map();
  for (const file of files) {
    const sha256 = await sha256File(file.absolutePath);
    const group = byHash.get(sha256) ?? [];
    group.push(file);
    byHash.set(sha256, group);
  }

  const duplicateGroups = [...byHash.entries()]
    .map(([sha256, group]) => ({ canonical: chooseCanonical(group), group, sha256 }))
    .filter(item => item.group.length > 1);

  let alreadyLinked = 0;
  let linked = 0;
  let planned = 0;
  const samples = [];

  for (const { canonical, group, sha256 } of duplicateGroups) {
    const duplicates = group.filter(file => file.absolutePath !== canonical.absolutePath);
    planned += duplicates.length;
    if (samples.length < 8) {
      samples.push({
        canonical: canonical.relPath,
        count: group.length,
        duplicates: duplicates.slice(0, 5).map(file => file.relPath),
        sha256: sha256.slice(0, 12),
      });
    }
    for (const duplicate of duplicates) {
      if (await areSameFile(canonical.absolutePath, duplicate.absolutePath)) {
        alreadyLinked += 1;
        continue;
      }
      if (!args.apply) {
        continue;
      }
      const result = await replaceWithHardlink(canonical.absolutePath, duplicate.absolutePath);
      if (result === "already-linked") {
        alreadyLinked += 1;
      }
      else {
        linked += 1;
      }
    }
  }

  console.log(JSON.stringify({
    alreadyLinked,
    applied: args.apply,
    duplicateGroups: duplicateGroups.length,
    imageFiles: files.length,
    linked,
    plannedDuplicateFiles: planned,
    samples,
    sourceRoot,
    uniqueImages: byHash.size,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
