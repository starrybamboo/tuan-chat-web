const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const workspacePackagesRoot = path.resolve(workspaceRoot, "packages");
const workspaceNodeModulesRoot = path.resolve(workspaceRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

config.resolver.assetExts = [...config.resolver.assetExts, "wasm"];

// 只监听移动端实际依赖的 workspace 包与根依赖目录，避免 Windows 上 Metro 扫描整仓导致 EMFILE。
config.watchFolders = [workspacePackagesRoot, workspaceNodeModulesRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  workspaceNodeModulesRoot,
];

module.exports = config;
