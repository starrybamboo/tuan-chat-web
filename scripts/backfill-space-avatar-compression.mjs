import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import process from "node:process";
import sharp from "sharp";
import { fetch } from "undici";

const TARGET_MAX_EDGE = 128;
const TARGET_MAX_BYTES = 40 * 1024;
const INITIAL_QUALITY = 72;
const MIN_QUALITY = 36;
const QUALITY_STEP = 6;
const FALLBACK_MAX_EDGES = [128, 112, 96, 80, 64];
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 10_000;
const DEFAULT_CONCURRENCY = 6;
const DEFAULT_DB = {
  host: "127.0.0.1",
  port: "5432",
  user: "postgres",
  database: "tuanchat_local",
};
const DEFAULT_OSS = {
  endpoint: "https://tuan.chat",
  bucket: "avatar",
  region: "us-east-1",
};
const DEFAULT_FALLBACK_AVATAR_URL = "http://tuan.chat/avatar/avatar/5275ec2f0e6ba166343a5ec60c5674d8_31076.webp";
const ENTITY_CONFIGS = {
  space: {
    idArg: "spaceId",
    idColumn: "space_id",
    label: "space",
    objectPrefix: "avatar/space-avatar-list",
    sourceReason: "space-avatar",
    table: "space",
  },
  room: {
    idArg: "roomId",
    idColumn: "room_id",
    label: "room",
    objectPrefix: "avatar/room-avatar-list",
    sourceReason: "room-avatar",
    table: "room",
  },
};

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exitCode = 1;
});

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const dbConfig = {
    host: args.pgHost ?? process.env.PGHOST ?? DEFAULT_DB.host,
    port: args.pgPort ?? process.env.PGPORT ?? DEFAULT_DB.port,
    user: args.pgUser ?? process.env.PGUSER ?? DEFAULT_DB.user,
    password: args.pgPassword ?? process.env.PGPASSWORD ?? "",
    database: args.pgDatabase ?? process.env.PGDATABASE ?? DEFAULT_DB.database,
  };
  const ossConfig = {
    endpoint: trimTrailingSlash(args.ossEndpoint ?? process.env.OSS_ENDPOINT ?? DEFAULT_OSS.endpoint),
    bucket: args.ossBucket ?? process.env.OSS_BUCKET ?? DEFAULT_OSS.bucket,
    accessKey: args.ossAccessKey ?? process.env.OSS_ACCESS_KEY,
    secretKey: args.ossSecretKey ?? process.env.OSS_SECRET_KEY,
    region: args.ossRegion ?? process.env.OSS_REGION ?? DEFAULT_OSS.region,
  };

  const execute = Boolean(args.execute);
  const force = Boolean(args.force);
  const entityConfig = resolveEntityConfig(args.entity);
  const rows = await loadRows(dbConfig, args, entityConfig);
  const stats = createStats();
  const concurrency = resolveConcurrency(args.concurrency);
  const downloadTimeoutMs = resolveDownloadTimeoutMs(args.downloadTimeoutMs);
  const optimizedSourceCache = new Map();

  console.log(`${entityConfig.label} avatar backfill mode=${execute ? "execute" : "dry-run"} rows=${rows.length} concurrency=${concurrency}`);
  console.log(`target maxEdge=${TARGET_MAX_EDGE}px maxSize=${formatBytes(TARGET_MAX_BYTES)} quality=${INITIAL_QUALITY}`);

  if (execute && (!ossConfig.accessKey || !ossConfig.secretKey)) {
    throw new Error("执行上传需要 OSS_ACCESS_KEY 和 OSS_SECRET_KEY，或传 --oss-access-key/--oss-secret-key。");
  }

  await runRows(rows, concurrency, async (row) => {
    stats.scanned += 1;

    try {
      const result = await processListAvatar(row, dbConfig, ossConfig, entityConfig, execute, downloadTimeoutMs, force, optimizedSourceCache);
      collectStats(stats, result);
      logRow(entityConfig.label, row.entityId, result);
    }
    catch (err) {
      stats.failed += 1;
      console.warn(`[failed] ${entityConfig.label}=${row.entityId} ${err?.message ?? err}`);
    }
  });

  printSummary(stats);
}

async function processListAvatar(row, dbConfig, ossConfig, entityConfig, execute, downloadTimeoutMs, force, optimizedSourceCache) {
  if (!row.avatar) {
    return { action: "skip", reason: "empty-avatar" };
  }

  if (isBackfilledUrl(row.avatar, ossConfig, entityConfig)) {
    return { action: "skip", reason: "already-backfilled" };
  }

  const { source, download, optimized } = await loadOptimizedFirstAvailableSource(resolveSourceAvatars(row, entityConfig), downloadTimeoutMs, optimizedSourceCache);
  const shouldUpdate = force || source.reason !== entityConfig.sourceReason || shouldReplace(download, optimized);

  if (!shouldUpdate) {
    return {
      action: "skip",
      reason: "already-small",
      oldBytes: download.bytes.length,
      newBytes: optimized.bytes.length,
      originalWidth: optimized.originalWidth,
      originalHeight: optimized.originalHeight,
      outputWidth: optimized.outputWidth,
      outputHeight: optimized.outputHeight,
      sourceReason: source.reason,
    };
  }

  if (!execute) {
    return {
      action: "would-update",
      oldBytes: download.bytes.length,
      newBytes: optimized.bytes.length,
      originalWidth: optimized.originalWidth,
      originalHeight: optimized.originalHeight,
      outputWidth: optimized.outputWidth,
      outputHeight: optimized.outputHeight,
      sourceReason: source.reason,
    };
  }

  const objectName = buildBackfillObjectName(row, entityConfig, download.bytes, optimized.bytes);
  const newAvatar = await putObject(ossConfig, objectName, optimized.bytes, "image/webp");
  const updated = await updateAvatar(dbConfig, entityConfig, row, newAvatar, resolveOriginalAvatarForUpdate(row, source));

  if (!updated) {
    return {
      action: "skip",
      reason: "avatar-changed",
      oldBytes: download.bytes.length,
      newBytes: optimized.bytes.length,
      originalWidth: optimized.originalWidth,
      originalHeight: optimized.originalHeight,
      outputWidth: optimized.outputWidth,
      outputHeight: optimized.outputHeight,
      sourceReason: source.reason,
    };
  }

  return {
    action: "updated",
    oldBytes: download.bytes.length,
    newBytes: optimized.bytes.length,
    originalWidth: optimized.originalWidth,
    originalHeight: optimized.originalHeight,
    outputWidth: optimized.outputWidth,
    outputHeight: optimized.outputHeight,
    sourceReason: source.reason,
    newAvatar,
  };
}

async function loadRows(dbConfig, args, entityConfig) {
  const where = ["s.avatar is not null", "s.avatar <> ''"];
  const targetId = args[entityConfig.idArg];
  if (targetId)
    where.push(`s.${entityConfig.idColumn} = ${toIntegerSql(targetId, entityConfig.idArg)}`);

  const limit = args.limit ? ` limit ${toIntegerSql(args.limit, "limit")}` : "";
  const sql = entityConfig.label === "room" ? buildRoomRowsSql(where, limit) : buildSpaceRowsSql(where, limit);

  const output = await runPsql(dbConfig, ["-At", "-v", "ON_ERROR_STOP=1", "-c", sql]);
  return output
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function buildSpaceRowsSql(where, limit) {
  return `
select json_build_object(
  'entityId', s.space_id,
  'avatar', s.avatar,
  'originalAvatar', s.original_avatar,
  'parentSpaceAvatar', null,
  'spaceOriginalAvatar', null,
  'userAvatar', u.avatar,
  'userOriginalAvatar', u.original_avatar
)::text
from tuanchat.space s
left join tuanchat.user u on u.user_id = s.user_id
where ${where.join(" and ")}
order by s.space_id
${limit};
`;
}

function buildRoomRowsSql(where, limit) {
  return `
select json_build_object(
  'entityId', s.room_id,
  'avatar', s.avatar,
  'originalAvatar', s.original_avatar,
  'parentSpaceAvatar', sp.avatar,
  'spaceOriginalAvatar', sp.original_avatar,
  'userAvatar', u.avatar,
  'userOriginalAvatar', u.original_avatar
)::text
from tuanchat.room s
left join tuanchat.space sp on sp.space_id = s.space_id
left join tuanchat.user u on u.user_id = sp.user_id
where ${where.join(" and ")}
order by s.room_id
${limit};
`;
}

async function updateAvatar(dbConfig, entityConfig, row, newAvatar, nextOriginalAvatar) {
  const sql = `
update tuanchat.${entityConfig.table}
set avatar = ${sqlLiteral(newAvatar)},
    original_avatar = ${sqlLiteral(nextOriginalAvatar)},
    update_time = now()
where ${entityConfig.idColumn} = ${toIntegerSql(row.entityId, entityConfig.idArg)}
  and avatar = ${sqlLiteral(row.avatar)};
`;
  const output = await runPsql(dbConfig, ["-At", "-v", "ON_ERROR_STOP=1", "-c", sql]);
  return /UPDATE\s+1\b/.test(output);
}

async function runPsql(dbConfig, extraArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", [
      "-h",
      dbConfig.host,
      "-p",
      String(dbConfig.port),
      "-U",
      dbConfig.user,
      "-d",
      dbConfig.database,
      ...extraArgs,
    ], {
      env: {
        ...process.env,
        PGPASSWORD: dbConfig.password ?? "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(stderr.trim() || `psql exited with code ${code}`));
    });
  });
}

async function downloadImage(url, downloadTimeoutMs) {
  const response = await fetch(url, {
    headers: {
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(downloadTimeoutMs),
  });
  if (!response.ok)
    throw new Error(`download ${response.status} ${response.statusText}: ${url}`);

  const contentType = response.headers.get("content-type") ?? "";
  const normalizedType = contentType.toLowerCase();
  if (normalizedType
    && !normalizedType.startsWith("image/")
    && !normalizedType.startsWith("application/octet-stream")
    && !normalizedType.startsWith("binary/octet-stream")) {
    throw new Error(`not image content-type=${contentType || "unknown"}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0)
    throw new Error("empty image");

  return {
    bytes,
    contentType,
  };
}

async function compressSpaceAvatar(bytes) {
  const input = sharp(bytes, { animated: false });
  const metadata = await input.metadata();
  let best = null;

  for (const maxEdge of FALLBACK_MAX_EDGES) {
    const base = sharp(bytes, { animated: false })
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      });

    for (let quality = INITIAL_QUALITY; quality >= MIN_QUALITY; quality -= QUALITY_STEP) {
      const output = await base.clone().webp({ quality, effort: 6 }).toBuffer({ resolveWithObject: true });
      best = output;
      if (output.data.length <= TARGET_MAX_BYTES) {
        return {
          bytes: output.data,
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          outputWidth: output.info.width,
          outputHeight: output.info.height,
        };
      }
    }
  }

  return {
    bytes: best.data,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    outputWidth: best.info.width,
    outputHeight: best.info.height,
  };
}

function shouldReplace(download, optimized) {
  if (optimized.bytes.length > TARGET_MAX_BYTES)
    return false;
  if (download.bytes.length > TARGET_MAX_BYTES)
    return true;
  if (optimized.originalWidth > TARGET_MAX_EDGE || optimized.originalHeight > TARGET_MAX_EDGE)
    return true;
  return optimized.bytes.length < download.bytes.length;
}

async function loadOptimizedFirstAvailableSource(sources, downloadTimeoutMs, optimizedSourceCache) {
  const errors = [];
  for (const source of sources) {
    try {
      const optimizedSource = await loadOptimizedSource(source.url, downloadTimeoutMs, optimizedSourceCache);
      return { source, ...optimizedSource };
    }
    catch (err) {
      errors.push(`${source.reason}: ${err?.message ?? err}`);
    }
  }
  throw new Error(errors.join("; "));
}

async function loadOptimizedSource(url, downloadTimeoutMs, optimizedSourceCache) {
  if (!optimizedSourceCache.has(url)) {
    optimizedSourceCache.set(url, downloadImage(url, downloadTimeoutMs).then(async download => ({
      download,
      optimized: await compressSpaceAvatar(download.bytes),
    })));
  }
  return optimizedSourceCache.get(url);
}

function resolveSourceAvatars(row, entityConfig) {
  const candidates = [
    { url: row.avatar, reason: entityConfig.sourceReason },
    { url: row.originalAvatar, reason: `${entityConfig.label}-original-avatar` },
    { url: row.parentSpaceAvatar, reason: "parent-space-avatar" },
    { url: row.spaceOriginalAvatar, reason: "space-original-avatar" },
    { url: row.userAvatar, reason: "owner-avatar" },
    { url: row.userOriginalAvatar, reason: "owner-original-avatar" },
    { url: DEFAULT_FALLBACK_AVATAR_URL, reason: "default-fallback-avatar" },
  ];
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!isHttpUrl(candidate.url) || seen.has(candidate.url))
      return false;
    seen.add(candidate.url);
    return true;
  });
}

function resolveOriginalAvatarForUpdate(row, source) {
  if (isHttpUrl(row.originalAvatar))
    return row.originalAvatar;
  return source.url;
}

async function putObject(ossConfig, objectName, body, contentType) {
  const endpoint = new URL(ossConfig.endpoint);
  const canonicalUri = `/${ossConfig.bucket}/${objectName.split("/").map(encodeRfc3986).join("/")}`;
  const uploadUrl = new URL(canonicalUri, endpoint);
  const amzDate = toAmzDate(new Date());
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const host = uploadUrl.host;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
  ].join("\n");
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${ossConfig.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(ossConfig.secretKey, dateStamp, ossConfig.region, "s3");
  const signature = hmacHex(signingKey, stringToSign);
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${ossConfig.accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "authorization": authorization,
      "content-type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`upload ${response.status} ${response.statusText}: ${text.slice(0, 300)}`);
  }

  return `${ossConfig.endpoint}/${ossConfig.bucket}/${objectName}`;
}

function buildBackfillObjectName(row, entityConfig, oldBytes, newBytes) {
  const today = new Date();
  const month = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const hash = crypto
    .createHash("sha256")
    .update(row.avatar)
    .update(oldBytes)
    .update(newBytes)
    .digest("hex")
    .slice(0, 16);
  return `${entityConfig.objectPrefix}/${month}/${entityConfig.label}-${row.entityId}-${hash}.webp`;
}

function isBackfilledUrl(url, ossConfig, entityConfig) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes(`/${ossConfig.bucket}/${entityConfig.objectPrefix}/`);
  }
  catch {
    return false;
  }
}

async function runRows(rows, concurrency, handler) {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (index < rows.length) {
      const row = rows[index];
      index += 1;
      await handler(row);
    }
  });
  await Promise.all(workers);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") {
      parsed.execute = true;
      continue;
    }
    if (arg === "--force") {
      parsed.force = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (!arg.startsWith("--"))
      throw new Error(`未知参数：${arg}`);

    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith("--"))
      throw new Error(`参数 ${arg} 需要值`);
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function resolveConcurrency(value) {
  if (value == null)
    return DEFAULT_CONCURRENCY;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0 || number > 16)
    throw new Error("concurrency 必须是 1 到 16 的整数");
  return number;
}

function resolveDownloadTimeoutMs(value) {
  if (value == null)
    return DEFAULT_DOWNLOAD_TIMEOUT_MS;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1000 || number > 120_000)
    throw new Error("download-timeout-ms 必须是 1000 到 120000 的整数");
  return number;
}

function resolveEntityConfig(value) {
  const entity = value ?? "space";
  const config = ENTITY_CONFIGS[entity];
  if (!config)
    throw new Error("entity 必须是 space 或 room");
  return config;
}

function createStats() {
  return {
    scanned: 0,
    wouldUpdate: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    oldBytes: 0,
    newBytes: 0,
  };
}

function collectStats(stats, result) {
  if (result.action === "would-update")
    stats.wouldUpdate += 1;
  else if (result.action === "updated")
    stats.updated += 1;
  else if (result.action === "skip")
    stats.skipped += 1;

  if (typeof result.oldBytes === "number")
    stats.oldBytes += result.oldBytes;
  if (typeof result.newBytes === "number")
    stats.newBytes += result.newBytes;
}

function logRow(entityLabel, entityId, result) {
  const sizes = typeof result.oldBytes === "number"
    ? ` ${formatBytes(result.oldBytes)} -> ${formatBytes(result.newBytes)}`
    : "";
  const dimension = result.outputWidth && result.outputHeight
    ? ` ${result.originalWidth ?? "?"}x${result.originalHeight ?? "?"}->${result.outputWidth}x${result.outputHeight}`
    : "";
  const reason = result.reason ? ` reason=${result.reason}` : "";
  const source = result.sourceReason ? ` source=${result.sourceReason}` : "";
  console.log(`[${result.action}] ${entityLabel}=${entityId}${sizes}${dimension}${reason}${source}`);
}

function printSummary(stats) {
  console.log("");
  console.log("summary");
  console.log(`  scanned: ${stats.scanned}`);
  console.log(`  wouldUpdate: ${stats.wouldUpdate}`);
  console.log(`  updated: ${stats.updated}`);
  console.log(`  skipped: ${stats.skipped}`);
  console.log(`  failed: ${stats.failed}`);
  console.log(`  measuredOld: ${formatBytes(stats.oldBytes)}`);
  console.log(`  measuredNew: ${formatBytes(stats.newBytes)}`);
  console.log(`  measuredSaved: ${formatBytes(Math.max(0, stats.oldBytes - stats.newBytes))}`);
}

function printHelp() {
  console.log(`
Usage:
  node scripts/backfill-space-avatar-compression.mjs [options]

默认 dry-run：读取目标列表头像，下载并压缩预估，但不上传、不改库。
真实执行需传 --execute，并提供 OSS_ACCESS_KEY / OSS_SECRET_KEY。

Options:
  --entity <space|room>         迁移目标，默认 space
  --execute                     上传新 WebP 并更新目标 avatar
  --force                       即使压缩后不更小，也强制转换为新的 OSS 对象
  --limit <n>                   限制处理数量
  --space-id <id>               只处理指定空间
  --room-id <id>                只处理指定房间
  --pg-host <host>              默认 ${DEFAULT_DB.host}
  --pg-port <port>              默认 ${DEFAULT_DB.port}
  --pg-user <user>              默认 ${DEFAULT_DB.user}
  --pg-password <password>      默认读取 PGPASSWORD
  --pg-database <database>      默认 ${DEFAULT_DB.database}
  --oss-endpoint <url>          默认 ${DEFAULT_OSS.endpoint}
  --oss-bucket <bucket>         默认 ${DEFAULT_OSS.bucket}
  --oss-access-key <key>        默认读取 OSS_ACCESS_KEY
  --oss-secret-key <secret>     默认读取 OSS_SECRET_KEY
  --oss-region <region>         默认 ${DEFAULT_OSS.region}
  --concurrency <n>             并发下载/压缩数量，默认 ${DEFAULT_CONCURRENCY}
  --download-timeout-ms <ms>    单张图片下载超时，默认 ${DEFAULT_DOWNLOAD_TIMEOUT_MS}
`);
}

function toIntegerSql(value, name) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0)
    throw new Error(`${name} 必须是正整数`);
  return String(number);
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, "");
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  }
  catch {
    return false;
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes))
    return "0 B";
  if (bytes < 1024)
    return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key, value) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function hmacHex(key, value) {
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

function getSignatureKey(secretKey, dateStamp, regionName, serviceName) {
  const dateKey = hmac(`AWS4${secretKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, regionName);
  const dateRegionServiceKey = hmac(dateRegionKey, serviceName);
  return hmac(dateRegionServiceKey, "aws4_request");
}
