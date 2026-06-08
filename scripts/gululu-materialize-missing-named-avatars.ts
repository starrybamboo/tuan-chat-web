import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

type CleanIndexRow = {
  aggregatedSourceRelPaths?: string;
  assetKind?: string;
  character?: string;
  confidence?: string;
  outputRelPath?: string;
  sha256?: string;
  sourceRelPath?: string;
};

type MaterializeArgs = {
  assetKind?: string;
  dryRun?: boolean;
  force?: boolean;
  root?: string;
  roles?: string[];
};

type MaterializedManifest = {
  assetKind: string;
  count: number;
  generatedAt: string;
  items: Array<Record<string, unknown>>;
  role: string;
  source: string;
  sourceRoleDirs: string[];
};

type NamedAvatarSummary = {
  hiddenAltCount: number;
  interchangeableGroups: number;
  namedCount: number;
  outputDir: string;
  sourceCandidateCount: number;
  sourceCount: number;
};

const DEFAULT_ROOT = "D:\\gululu-cache\\output\\opus-88-owner-only-refetch-v3";
const SUPPORTED_ASSET_KINDS = new Set(["character-avatar-bust", "character-avatar-chat", "manga-avatar"]);

function readValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(argv: string[]): MaterializeArgs {
  const args: MaterializeArgs = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    }
    else if (arg === "--force") {
      args.force = true;
    }
    else if (arg === "--root") {
      args.root = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--roles") {
      args.roles = readValue(argv, index, arg).split(",").map(role => role.trim()).filter(Boolean);
      index++;
    }
    else if (arg === "--asset-kind") {
      args.assetKind = readValue(argv, index, arg);
      index++;
    }
  }
  return args;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === "\"") {
      if (quoted && text[index + 1] === "\"") {
        cell += "\"";
        index++;
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
      if (char === "\r" && text[index + 1] === "\n") {
        index++;
      }
      row.push(cell);
      if (row.some(value => value !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some(value => value !== "")) {
    rows.push(row);
  }
  const [headers, ...body] = rows;
  if (!headers) {
    return [];
  }
  return body.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) || (value && typeof value === "object")
    ? JSON.stringify(value)
    : String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function toCsv(rows: Array<Record<string, unknown>>, columns: string[]) {
  return [
    columns.join(","),
    ...rows.map(row => columns.map(column => csvCell(row[column])).join(",")),
  ].join("\n");
}

function normalizeRelPath(value: string | undefined) {
  return String(value ?? "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

function splitSourceRelPaths(row: CleanIndexRow) {
  const values = [
    row.sourceRelPath,
    ...String(row.aggregatedSourceRelPaths ?? "").split("|"),
  ];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeRelPath(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function finalRoot(root: string) {
  return path.join(root, "image-role-review-clean-vision-final");
}

function cleanOutputPath(root: string, row: CleanIndexRow) {
  const outputRelPath = normalizeRelPath(row.outputRelPath);
  return outputRelPath ? path.join(finalRoot(root), ...outputRelPath.split("/")) : "";
}

function sourcePath(root: string, sourceRelPath: string) {
  return path.join(root, "images", ...normalizeRelPath(sourceRelPath).split("/"));
}

function sanitizeUsageToken(value: string, fallback: string) {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return sanitized || fallback;
}

function usageKeyFor(assetKind: string, index: number) {
  const prefix = assetKind === "manga-avatar"
    ? "manga"
    : assetKind === "character-avatar-chat"
      ? "chat"
      : "bust";
  return index === 0 ? `${prefix}_default` : `${prefix}_variant_${String(index + 1).padStart(2, "0")}`;
}

function sourceCandidateFileName(prefix: string, index: number, sourceRelPath: string) {
  const ext = path.extname(sourceRelPath).toLowerCase() || ".png";
  const stem = sanitizeUsageToken(path.basename(sourceRelPath, ext), "source");
  return `${prefix}_SOURCE__S${String(index + 1).padStart(3, "0")}__${stem}${ext}`;
}

async function copySourceCandidates(params: {
  dryRun?: boolean;
  groupDir: string;
  root: string;
  sourceRelPaths: string[];
}) {
  const candidates = [];
  for (let index = 0; index < params.sourceRelPaths.length; index++) {
    const sourceRelPath = params.sourceRelPaths[index]!;
    const file = sourceCandidateFileName(index === 0 ? "KEEP" : "ALT", index, sourceRelPath);
    const from = sourcePath(params.root, sourceRelPath);
    const copied = existsSync(from);
    if (copied && !params.dryRun) {
      await copyFile(from, path.join(params.groupDir, file));
    }
    candidates.push({ copied, file, sourceRelPath });
  }
  return candidates;
}

async function buildManifestItem(params: {
  assetKind: string;
  dryRun?: boolean;
  index: number;
  outDir: string;
  role: string;
  root: string;
  row: CleanIndexRow;
}) {
  const sourceFile = cleanOutputPath(params.root, params.row);
  if (!sourceFile || !existsSync(sourceFile)) {
    throw new Error(`清洗头像文件不存在：${params.row.outputRelPath ?? ""}`);
  }
  const usageKey = usageKeyFor(params.assetKind, params.index);
  const versionedUsageKey = `${usageKey}__v001`;
  const ext = path.extname(sourceFile) || ".png";
  const file = `${versionedUsageKey}${ext.toLowerCase()}`;
  const outputFile = path.join(params.outDir, file);
  if (!params.dryRun) {
    await copyFile(sourceFile, outputFile);
  }
  const metadata = await sharp(sourceFile, { failOn: "none" }).metadata();
  const sourceRelPaths = splitSourceRelPaths(params.row);
  const groupDir = path.join(params.outDir, "_interchangeable", versionedUsageKey);
  if (!params.dryRun) {
    await mkdir(groupDir, { recursive: true });
  }
  const sourceCandidates = await copySourceCandidates({
    dryRun: params.dryRun,
    groupDir,
    root: params.root,
    sourceRelPaths,
  });
  const member = {
    aggregatedSourceRelPaths: sourceRelPaths,
    fileName: path.basename(sourceFile),
    finalOutputRelPath: normalizeRelPath(params.row.outputRelPath),
    height: metadata.height,
    id: "I001",
    sha256: params.row.sha256 ?? "",
    sourceCandidateCount: sourceCandidates.filter(candidate => candidate.copied).length,
    sourceCandidates,
    sourceRelPath: normalizeRelPath(params.row.sourceRelPath),
    width: metadata.width,
  };
  const item = {
    assetKind: params.assetKind,
    confidence: Number(params.row.confidence) || undefined,
    displayName: params.index === 0 ? "默认" : `候选 ${params.index + 1}`,
    file,
    interchangeableGroupId: versionedUsageKey,
    memberCount: 1,
    members: [member],
    representativeFinalOutputRelPath: normalizeRelPath(params.row.outputRelPath),
    representativeOriginalFile: path.basename(sourceFile),
    representativeSha256: params.row.sha256 ?? "",
    representativeSourceRelPath: normalizeRelPath(params.row.sourceRelPath),
    reviewStatus: "materialized-from-clean-index",
    role: params.role,
    sourceCandidateCount: member.sourceCandidateCount,
    usageKey,
    versionedUsageKey,
  };
  if (!params.dryRun) {
    await writeFile(path.join(groupDir, "group.json"), `${JSON.stringify(item, null, 2)}\n`, "utf8");
  }
  return item;
}

function groupRows(rows: CleanIndexRow[], args: Required<Pick<MaterializeArgs, "root">> & MaterializeArgs) {
  const roles = new Set(args.roles ?? []);
  const grouped = new Map<string, CleanIndexRow[]>();
  for (const row of rows) {
    const role = row.character?.trim();
    const assetKind = row.assetKind?.trim();
    const outputRelPath = normalizeRelPath(row.outputRelPath);
    if (!role || !assetKind || !outputRelPath.startsWith("avatars/") || !SUPPORTED_ASSET_KINDS.has(assetKind)) {
      continue;
    }
    if (roles.size > 0 && !roles.has(role)) {
      continue;
    }
    if (args.assetKind && args.assetKind !== assetKind) {
      continue;
    }
    const manifestPath = path.join(finalRoot(args.root), "named-avatars", role, assetKind, "avatar-manifest.json");
    if (!args.force && existsSync(manifestPath)) {
      continue;
    }
    const key = `${role}\u0000${assetKind}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

async function writeManifest(params: {
  assetKind: string;
  dryRun?: boolean;
  force?: boolean;
  root: string;
  role: string;
  rows: CleanIndexRow[];
}) {
  const outDir = path.join(finalRoot(params.root), "named-avatars", params.role, params.assetKind);
  const manifestPath = path.join(outDir, "avatar-manifest.json");
  if (!params.force && existsSync(manifestPath)) {
    return { action: "skipped-existing", assetKind: params.assetKind, count: 0, manifestPath, role: params.role };
  }
  if (!params.dryRun) {
    await mkdir(outDir, { recursive: true });
  }
  const sortedRows = [...params.rows].sort((left, right) =>
    normalizeRelPath(left.outputRelPath).localeCompare(normalizeRelPath(right.outputRelPath), "zh-Hans-CN"),
  );
  const items = [];
  for (let index = 0; index < sortedRows.length; index++) {
    items.push(await buildManifestItem({
      assetKind: params.assetKind,
      dryRun: params.dryRun,
      index,
      outDir,
      role: params.role,
      root: params.root,
      row: sortedRows[index]!,
    }));
  }
  const manifest: MaterializedManifest = {
    assetKind: params.assetKind,
    count: items.length,
    generatedAt: new Date().toISOString(),
    items,
    role: params.role,
    source: "clean-index-missing-named-avatar-materializer",
    sourceRoleDirs: [params.role],
  };
  if (!params.dryRun) {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await writeFile(
      path.join(outDir, "avatar-manifest.csv"),
      `${toCsv(items, [
        "file",
        "usageKey",
        "versionedUsageKey",
        "displayName",
        "role",
        "assetKind",
        "representativeSourceRelPath",
        "representativeFinalOutputRelPath",
        "representativeSha256",
        "memberCount",
        "sourceCandidateCount",
        "reviewStatus",
      ])}\n`,
      "utf8",
    );
  }
  return { action: params.dryRun ? "would-write" : "written", assetKind: params.assetKind, count: items.length, manifestPath, role: params.role };
}

async function listManifestPaths(namedRoot: string) {
  if (!existsSync(namedRoot)) {
    return [];
  }
  const manifests: string[] = [];
  for (const roleEntry of await readdir(namedRoot, { withFileTypes: true })) {
    if (!roleEntry.isDirectory()) {
      continue;
    }
    const roleDir = path.join(namedRoot, roleEntry.name);
    for (const kindEntry of await readdir(roleDir, { withFileTypes: true })) {
      if (!kindEntry.isDirectory()) {
        continue;
      }
      const manifestPath = path.join(roleDir, kindEntry.name, "avatar-manifest.json");
      if (existsSync(manifestPath)) {
        manifests.push(manifestPath);
      }
    }
  }
  return manifests.sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}

function summarizeManifest(manifest: MaterializedManifest, outputDir: string): NamedAvatarSummary {
  let hiddenAltCount = 0;
  let sourceCandidateCount = 0;
  let sourceCount = 0;
  for (const item of manifest.items ?? []) {
    const members = Array.isArray(item.members) ? item.members : [];
    const memberCount = Number(item.memberCount) || members.length || 1;
    hiddenAltCount += Math.max(0, memberCount - 1);
    sourceCandidateCount += Number(item.sourceCandidateCount) || 0;
    sourceCount += memberCount;
  }
  return {
    hiddenAltCount,
    interchangeableGroups: manifest.items?.length ?? 0,
    namedCount: manifest.items?.length ?? 0,
    outputDir: outputDir.replace(/\\/g, "/"),
    sourceCandidateCount,
    sourceCount,
  };
}

async function updateSummary(root: string) {
  const cleanRoot = finalRoot(root);
  const summaryPath = path.join(cleanRoot, "summary.json");
  if (!existsSync(summaryPath)) {
    return undefined;
  }
  const namedRoot = path.join(cleanRoot, "named-avatars");
  const summary = JSON.parse(await readFile(summaryPath, "utf8")) as Record<string, unknown>;
  const namedAvatars: Record<string, Record<string, NamedAvatarSummary>> = {};
  let kindCount = 0;
  let namedCount = 0;
  let hiddenAltCount = 0;
  let sourceCandidateCount = 0;
  let sourceCount = 0;
  for (const manifestPath of await listManifestPaths(namedRoot)) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as MaterializedManifest;
    const role = manifest.role;
    const assetKind = manifest.assetKind;
    const outputDir = path.dirname(manifestPath);
    if (!role || !assetKind) {
      continue;
    }
    const roleSummary = namedAvatars[role] ?? {};
    const itemSummary = summarizeManifest(manifest, outputDir);
    roleSummary[assetKind] = itemSummary;
    namedAvatars[role] = roleSummary;
    kindCount++;
    namedCount += itemSummary.namedCount;
    hiddenAltCount += itemSummary.hiddenAltCount;
    sourceCandidateCount += itemSummary.sourceCandidateCount;
    sourceCount += itemSummary.sourceCount;
  }
  summary.namedAvatars = namedAvatars;
  summary.namedAvatarsUpdatedAt = new Date().toISOString();
  summary.namedAvatarsTotals = {
    hiddenAltCount,
    kindCount,
    namedCount,
    roleCount: Object.keys(namedAvatars).length,
    sourceCandidateCount,
    sourceCount,
  };
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return summary.namedAvatarsTotals;
}

export async function runGululuMaterializeMissingNamedAvatars(argv: string[]) {
  const parsed = parseArgs(argv);
  const root = path.resolve(parsed.root ?? DEFAULT_ROOT);
  const indexPath = path.join(finalRoot(root), "index.csv");
  const rows = parseCsv(await readFile(indexPath, "utf8")) as CleanIndexRow[];
  const grouped = groupRows(rows, { ...parsed, root });
  const results = [];
  for (const [key, group] of [...grouped.entries()].sort((left, right) => left[0].localeCompare(right[0], "zh-Hans-CN"))) {
    const [role, assetKind] = key.split("\u0000") as [string, string];
    results.push(await writeManifest({
      assetKind,
      dryRun: parsed.dryRun,
      force: parsed.force,
      role,
      root,
      rows: group,
    }));
  }
  const namedAvatarsTotals = parsed.dryRun ? undefined : await updateSummary(root);
  return {
    ...(namedAvatarsTotals ? { namedAvatarsTotals } : {}),
    results,
    stats: {
      manifests: results.length,
      namedAvatars: results.reduce((sum, result) => sum + result.count, 0),
    },
  };
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  runGululuMaterializeMissingNamedAvatars(process.argv.slice(2))
    .then(result => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
