import { spawn } from "node:child_process";
import process from "node:process";

const passthroughArgs = process.argv.slice(2);
const args = ["--filter", "@tuanchat/web", "run", "start"];

if (passthroughArgs.length > 0) {
  args.push("--", ...passthroughArgs);
}

const child = spawn("pnpm", args, {
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
