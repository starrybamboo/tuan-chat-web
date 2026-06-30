const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const workspacePackagesRoot = path.resolve(workspaceRoot, "packages");
const workspaceNodeModulesRoot = path.resolve(workspaceRoot, "node_modules");
const emptyNodeModuleShim = path.resolve(projectRoot, "src/lib/empty-node-module.js");
const workspacePackageAliases = {
  "@tuanchat/domain": path.resolve(workspacePackagesRoot, "tuanchat-domain"),
  "@tuanchat/local-db": path.resolve(workspacePackagesRoot, "tuanchat-local-db"),
  "@tuanchat/openapi-client": path.resolve(workspacePackagesRoot, "tuanchat-openapi-client"),
  "@tuanchat/query": path.resolve(workspacePackagesRoot, "tuanchat-query"),
};

const config = getDefaultConfig(projectRoot);

config.resolver.assetExts = [...config.resolver.assetExts, "wasm"];
config.resolver.blockList = [/.*\.test\.[jt]sx?$/];

// 只监听移动端实际依赖的 workspace 包与根依赖目录，避免 Windows 上 Metro 扫描整仓导致 EMFILE。
config.watchFolders = [workspacePackagesRoot, workspaceNodeModulesRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  workspaceNodeModulesRoot,
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  fs: emptyNodeModuleShim,
  module: emptyNodeModuleShim,
  "node:fs": emptyNodeModuleShim,
  "node:module": emptyNodeModuleShim,
  "node:path": emptyNodeModuleShim,
  "node:url": emptyNodeModuleShim,
  path: emptyNodeModuleShim,
  url: emptyNodeModuleShim,
  ...workspacePackageAliases,
};

module.exports = config;
