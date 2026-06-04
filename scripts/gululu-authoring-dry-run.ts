import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createInMemoryAuthoringPrimitives } from "../app/agentAuthoring";

import { applyGululuReplayImportToAuthoring } from "./gululu-replay-import.mjs";

type DryRunArgs = {
  agentId?: string;
  input?: string;
  opusId?: number;
  out?: string;
  sourceKey?: string;
  targetRoomId?: number;
};

function readValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function parseDryRunArgs(argv: string[]): DryRunArgs {
  const args: DryRunArgs = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--input") {
      args.input = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--out") {
      args.out = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--target-room-id") {
      args.targetRoomId = Number(readValue(argv, index, arg));
      index++;
    }
    else if (arg === "--opus-id") {
      args.opusId = Number(readValue(argv, index, arg));
      index++;
    }
    else if (arg === "--source-key") {
      args.sourceKey = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--agent-id") {
      args.agentId = readValue(argv, index, arg);
      index++;
    }
  }
  return args;
}

function buildDefaultOutPath(inputPath: string) {
  return inputPath.replace(/\.tuanchat-replay-import\.json$/, ".authoring-dry-run.json");
}

function buildDryRunSummary(result: ReturnType<typeof applyGululuReplayImportToAuthoring>) {
  const roleNames = result.report.resources.roles
    .map(role => role.normalizedName)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
  return {
    batch: result.report.batch,
    readiness: result.readiness,
    resources: {
      avatars: result.report.resources.avatars.length,
      media: result.report.resources.media.length,
      roles: result.report.resources.roles.length,
      unresolvedMedia: result.report.resources.unresolvedMedia,
    },
    roleNames,
    stats: result.report.stats,
  };
}

export async function runGululuAuthoringDryRun(argv: string[]) {
  const args = parseDryRunArgs(argv);
  if (!args.input) {
    throw new Error("--input is required");
  }
  if (!args.targetRoomId) {
    throw new Error("--target-room-id is required");
  }

  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.out ?? buildDefaultOutPath(inputPath));
  const importPackage = JSON.parse(await readFile(inputPath, "utf8"));
  const authoring = createInMemoryAuthoringPrimitives();
  const result = applyGululuReplayImportToAuthoring(authoring, importPackage, {
    agentId: args.agentId ?? "gululu-authoring-dry-run",
    opusId: args.opusId,
    sourceKey: args.sourceKey,
    targetRoomId: args.targetRoomId,
  });
  const summary = buildDryRunSummary(result);
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return { outputPath, summary };
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  runGululuAuthoringDryRun(process.argv.slice(2))
    .then(({ outputPath, summary }) => {
      console.log(JSON.stringify({
        outputPath,
        readiness: summary.readiness,
        resources: {
          avatars: summary.resources.avatars,
          media: summary.resources.media,
          roles: summary.resources.roles,
          unresolvedMedia: summary.resources.unresolvedMedia.length,
        },
        stats: summary.stats,
      }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
