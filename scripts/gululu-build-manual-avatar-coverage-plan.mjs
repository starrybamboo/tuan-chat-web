#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = "D:\\gululu-cache\\output\\opus-88-owner-only-refetch-v3";
const PROTECTED_REFERENCE_ROLES = new Set(["八意永琳", "风见幽香", "博丽灵梦"]);
const ROLE_ALIASES = new Map([
  ["阿空", "灵乌路空"],
  ["阿燐", "火焰猫燐"],
  ["阿求", "稗田阿求"],
  ["爱丽丝", "爱丽丝·玛格特洛依德"],
  ["白莲", "圣白莲"],
  ["布都", "物部布都"],
  ["弁弁", "九十九弁弁"],
  ["八桥", "九十九八桥"],
  ["堇子", "宇佐见堇子"],
  ["董子", "宇佐见堇子"],
  ["辉夜", "蓬莱山辉夜"],
  ["慧音", "上白泽慧音"],
  ["合欢乃", "坂田合欢乃"],
  ["华扇", "茨木华扇"],
  ["荷取", "河城荷取"],
  ["觉", "古明地觉"],
  ["影狼", "今泉影狼"],
  ["雷鼓", "堀川雷鼓"],
  ["蓝", "八云蓝"],
  ["老郭", "郭海皇"],
  ["灵梦", "博丽灵梦"],
  ["烈", "烈海王"],
  ["妹红", "藤原妹红"],
  ["米斯蒂娅", "米斯蒂娅·萝蕾拉"],
  ["魔理沙", "雾雨魔理沙"],
  ["猯藏", "二岩猯藏"],
  ["青娥", "霍青娥"],
  ["神奈子", "八坂神奈子"],
  ["神子", "丰聪耳神子"],
  ["四季", "四季映姬"],
  ["探女", "稀神探女"],
  ["针妙丸", "少名针妙丸"],
  ["永琳", "八意永琳"],
  ["师匠", "八意永琳"],
  ["太子", "丰聪耳神子"],
  ["天子", "比那名居天子"],
  ["文文", "射命丸文"],
  ["小伞", "多多良小伞"],
  ["咲夜", "十六夜咲夜"],
  ["一轮", "云居一轮"],
  ["妖梦", "魂魄妖梦"],
  ["幽香", "风见幽香"],
  ["幽幽子", "西行寺幽幽子"],
  ["勇仪", "星熊勇仪"],
  ["早苗", "东风谷早苗"],
  ["茨华仙", "茨木华扇"],
  ["恋恋", "古明地恋"],
  ["梦烈", "烈海王"],
  ["鵺", "封兽鵺"],
  ["芙兰", "芙兰朵露·斯卡雷特"],
  ["芙兰朵露", "芙兰朵露·斯卡雷特"],
  ["霖之助", "森近霖之助"],
  ["正邪", "鬼人正邪"],
  ["紫", "八云紫"],
  ["紫苑", "依神紫苑"],
  ["女苑", "依神女苑"],
  ["萃香", "伊吹萃香"],
]);

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
  const root = path.resolve(args.get("root") ?? DEFAULT_ROOT);
  const finalRoot = path.join(root, "image-role-review-clean-vision-final");
  return {
    finalRoot,
    includeProtected: args.has("include-protected"),
    out: path.resolve(args.get("out") ?? path.join(finalRoot, "reports", "named-avatar-manual-fix", "_coverage", "remaining-coverage-plan.json")),
    root,
  };
}

function normalizeRole(role) {
  const text = String(role ?? "").trim();
  return ROLE_ALIASES.get(text) ?? text;
}

function toRelPath(file, root) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function byChinesePath(left, right) {
  return left.localeCompare(right, "zh-CN");
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

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  }
  catch {
    return false;
  }
}

async function listAvatarJobs(finalRoot) {
  const avatarsRoot = path.join(finalRoot, "avatars");
  const jobs = new Map();
  for (const roleEntry of await fs.readdir(avatarsRoot, { withFileTypes: true })) {
    if (!roleEntry.isDirectory())
      continue;
    const sourceRole = roleEntry.name;
    const outputRole = normalizeRole(sourceRole);
    for (const kindEntry of await fs.readdir(path.join(avatarsRoot, sourceRole), { withFileTypes: true })) {
      if (!kindEntry.isDirectory())
        continue;
      const assetKind = kindEntry.name;
      const assetDir = path.join(avatarsRoot, sourceRole, assetKind);
      const files = (await fs.readdir(assetDir))
        .filter(file => path.extname(file).toLowerCase() === ".png")
        .sort(byChinesePath)
        .map(file => path.join(assetDir, file));
      if (files.length === 0)
        continue;
      const key = `${outputRole}\u0000${assetKind}`;
      if (!jobs.has(key)) {
        jobs.set(key, {
          assetKind,
          files: [],
          outputRole,
          sourceRoleDirs: new Set(),
        });
      }
      const job = jobs.get(key);
      job.files.push(...files);
      job.sourceRoleDirs.add(sourceRole);
    }
  }
  return [...jobs.values()]
    .map(job => ({
      ...job,
      files: job.files.sort((left, right) => byChinesePath(toRelPath(left, finalRoot), toRelPath(right, finalRoot))),
      sourceRoleDirs: [...job.sourceRoleDirs].sort(byChinesePath),
    }))
    .sort((left, right) => byChinesePath(`${left.outputRole}/${left.assetKind}`, `${right.outputRole}/${right.assetKind}`));
}

async function readExistingManifest(finalRoot, role, assetKind) {
  const manifestPath = path.join(finalRoot, "named-avatars", role, assetKind, "avatar-manifest.json");
  if (!await pathExists(manifestPath))
    return null;
  return {
    manifest: JSON.parse(await fs.readFile(manifestPath, "utf8")),
    role,
  };
}

function stateFromItem(item) {
  return {
    affect: sanitizeToken(item.affect ?? item.emotion, "uncertain"),
    blush: sanitizeToken(item.blush, "none"),
    emotion: sanitizeToken(item.emotion, "uncertain"),
    eyes: sanitizeToken(item.eyes, "unknown"),
    gaze: sanitizeToken(item.gaze, "front"),
    mouth: sanitizeToken(item.mouth, "unknown"),
    pose: sanitizeToken(item.pose, "front"),
    shadow: sanitizeToken(item.shadow, "none"),
    sweat: sanitizeToken(item.sweat, "none"),
    tears: sanitizeToken(item.tears, "none"),
    wound: sanitizeToken(item.wound, "none"),
  };
}

function fallbackGroup({ assetKind, id }) {
  const suffix = id.toLowerCase();
  const manga = assetKind === "manga-avatar";
  const chat = assetKind === "character-avatar-chat";
  const usageKey = manga
    ? `uncertain_manga_${suffix}`
    : `uncertain_front_unknown_front_unknown${chat ? "_chat" : ""}_${suffix}`;
  return {
    usageKey,
    displayName: manga ? `待审漫画头像 ${id}` : `待审头像 ${id}`,
    representativeId: id,
    memberIds: [id],
    emotion: "uncertain",
    affect: "uncertain",
    eyes: "unknown",
    gaze: "front",
    mouth: "unknown",
    pose: "front",
    blush: "none",
    shadow: "none",
    sweat: "none",
    tears: "none",
    wound: "none",
    reason: "覆盖性保守分组：未做自动折叠，保留为主图等待后续人工表情命名。",
  };
}

function groupsFromExistingManifest(existing, idByRelPath, usedIds) {
  const groups = [];
  for (const item of existing?.manifest?.items ?? []) {
    const memberIds = [];
    for (const member of item.members ?? []) {
      const relPath = String(member.finalOutputRelPath ?? "").replaceAll("\\", "/");
      const id = idByRelPath.get(relPath);
      if (id && !usedIds.has(id)) {
        memberIds.push(id);
        usedIds.add(id);
      }
    }
    if (memberIds.length === 0)
      continue;
    const representativeRelPath = String(item.representativeFinalOutputRelPath ?? "").replaceAll("\\", "/");
    const representativeId = memberIds.includes(idByRelPath.get(representativeRelPath))
      ? idByRelPath.get(representativeRelPath)
      : memberIds[0];
    groups.push({
      usageKey: item.usageKey,
      displayName: item.displayName,
      representativeId,
      memberIds,
      ...stateFromItem(item),
      reason: item.collapseReason || "复用既有人工 manifest 分组。",
    });
  }
  return groups;
}

async function buildPlan(args) {
  const jobs = [];
  const avatarJobs = await listAvatarJobs(args.finalRoot);
  for (const sourceJob of avatarJobs) {
    const { assetKind, files, outputRole, sourceRoleDirs } = sourceJob;
    if (!args.includeProtected && PROTECTED_REFERENCE_ROLES.has(outputRole))
      continue;
    const relPaths = files.map(file => toRelPath(file, args.finalRoot));
    const idByRelPath = new Map(relPaths.map((relPath, index) => [relPath, `I${String(index + 1).padStart(3, "0")}`]));
    const existingManifests = [];
    const canonicalExisting = await readExistingManifest(args.finalRoot, outputRole, assetKind);
    if (canonicalExisting)
      existingManifests.push(canonicalExisting);
    for (const sourceRole of sourceRoleDirs) {
      if (sourceRole === outputRole)
        continue;
      const legacyExisting = await readExistingManifest(args.finalRoot, sourceRole, assetKind);
      if (legacyExisting)
        existingManifests.push(legacyExisting);
    }
    const usedIds = new Set();
    const groups = [];
    for (const existing of existingManifests)
      groups.push(...groupsFromExistingManifest(existing, idByRelPath, usedIds));
    const existingCoveredCount = usedIds.size;
    for (const [relPath, id] of idByRelPath) {
      if (usedIds.has(id))
        continue;
      groups.push(fallbackGroup({ assetKind, id, relPath }));
      usedIds.add(id);
    }
    const archiveLegacyNamedDirs = sourceRoleDirs
      .filter(sourceRole => sourceRole !== outputRole)
      .filter(sourceRole => existingManifests.some(existing => existing.role === sourceRole))
      .map(sourceRole => `${sourceRole}/${assetKind}`);
    if (groups.length === 0)
      continue;
    if (existingManifests.length > 0 && existingCoveredCount === relPaths.length && archiveLegacyNamedDirs.length === 0)
      continue;
    jobs.push({
      role: outputRole,
      outputRole,
      assetKind,
      archiveLegacyNamedDirs,
      sourceRoleDirs,
      files,
      groups,
    });
  }
  return {
    source: "manual-coverage-pass",
    reviewStatus: "manual-coverage-pass",
    namingSource: "manual-coverage-2026-06-07",
    interchangeablePolicy: "manual coverage pass: reuse existing manual groups; new uncovered images remain one-per-main until expression review",
    jobs,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const plan = await buildPlan(args);
  await fs.mkdir(path.dirname(args.out), { recursive: true });
  await fs.writeFile(args.out, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  const sourceCount = plan.jobs.reduce((sum, job) => sum + job.files.length, 0);
  const groupCount = plan.jobs.reduce((sum, job) => sum + job.groups.length, 0);
  console.log(`[coverage-plan] jobs=${plan.jobs.length} source=${sourceCount} groups=${groupCount} out=${args.out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
