import { spawn } from "node:child_process";
import { availableParallelism, freemem } from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";

const BYTES_PER_GIB = 1024 ** 3;
const MAX_AUTO_THREADS = 8;
const MAX_OVERRIDE_THREADS = 16;
const MEMORY_GIB_PER_THREAD = 4;

function hasThreadsArgument(args) {
  return args.some(arg => arg === "--threads" || arg.startsWith("--threads="));
}

function resolveThreadsOverride() {
  const rawValue = process.env.TUANCHAT_OXLINT_THREADS;
  if (rawValue == null || rawValue.trim() === "") {
    return null;
  }
  if (!/^\d+$/.test(rawValue)) {
    throw new Error("TUANCHAT_OXLINT_THREADS must be an integer between 1 and 16");
  }
  const value = Number(rawValue);
  if (value < 1 || value > MAX_OVERRIDE_THREADS) {
    throw new Error("TUANCHAT_OXLINT_THREADS must be an integer between 1 and 16");
  }
  return value;
}

function resolveAutomaticThreads() {
  const cpuLimit = Math.max(1, Math.ceil(availableParallelism() / 2));
  // Oxlint allocates a fixed pool per worker, so free memory is a stricter limit than CPU count.
  const memoryLimit = Math.max(1, Math.floor(freemem() / BYTES_PER_GIB / MEMORY_GIB_PER_THREAD));
  return Math.min(MAX_AUTO_THREADS, cpuLimit, memoryLimit);
}

const passthroughArgs = process.argv.slice(2);
let oxlintArgs = passthroughArgs;

if (!hasThreadsArgument(passthroughArgs)) {
  try {
    const threads = resolveThreadsOverride() ?? resolveAutomaticThreads();
    oxlintArgs = [...passthroughArgs, `--threads=${threads}`];
    console.log(`[oxlint] threads=${threads}`);
  }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

const oxlintBin = fileURLToPath(new URL("../node_modules/oxlint/bin/oxlint", import.meta.url));
const child = spawn(process.execPath, [oxlintBin, ...oxlintArgs], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Failed to start oxlint: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
