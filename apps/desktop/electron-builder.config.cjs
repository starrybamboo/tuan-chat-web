const path = require("node:path");

const desktopDir = __dirname;
const workspaceRoot = path.resolve(desktopDir, "..", "..");
const defaultWebGALTerreReleaseDir = path.resolve(workspaceRoot, "..", "WebGAL_Terre", "release", "tuanchat-runtime");
const localOutputDir = "release_local_latest";
const desktopIconPng = "build/icons/icon.png";
const desktopIconIco = "build/icons/icon.ico";
const desktopIconIcns = "build/icons/icon.icns";

function resolveWebGALTerreReleaseDir() {
  const rawDir = String(process.env.WEBGAL_TERRE_RELEASE_DIR || defaultWebGALTerreReleaseDir).trim();
  if (!rawDir) {
    return defaultWebGALTerreReleaseDir;
  }

  return path.isAbsolute(rawDir) ? rawDir : path.resolve(desktopDir, rawDir);
}

const webGALTerreReleaseDir = resolveWebGALTerreReleaseDir();
const webGALTerreRuntimeFiles = {
  from: webGALTerreReleaseDir,
  filter: [
    "WebGAL_Terre.exe",
    "WebGAL_Teree.exe",
    "assets/**",
    "lib/**",
    "public/**",
    "!public/games/**",
    "!Exported_Games/**",
  ],
};

function createConfig(request = {}) {
  const projectDir = request.projectDir ? path.resolve(request.projectDir) : desktopDir;
  const runsFromWorkspaceRoot = projectDir.toLowerCase() === workspaceRoot.toLowerCase();

  return {
  appId: "com.tuanchat.tuanchat",
  productName: "团剧共创",
  copyright: "Copyright © 2025 ${tuan-chat}",
  publish: [
    {
      provider: "generic",
      url: "https://tuan.chat/updates/",
    },
  ],
  files: ["./electron/main/**/*", "./electron/preload/**/*", "./build/**/*"],
  beforeBuild: async () => false,
  directories: {
    ...(runsFromWorkspaceRoot ? { app: "apps/desktop" } : {}),
    output: runsFromWorkspaceRoot ? localOutputDir : `../../${localOutputDir}`,
  },
  win: {
    icon: desktopIconIco,
    extraFiles: [
      {
        ...webGALTerreRuntimeFiles,
        to: "resources/webgal-terre",
      },
    ],
    target: ["nsis", "zip"],
  },
  mac: {
    icon: desktopIconIcns,
    extraFiles: [
      {
        ...webGALTerreRuntimeFiles,
        to: "Resources/webgal-terre",
      },
    ],
    target: ["dmg", "zip"],
  },
  linux: {
    icon: desktopIconPng,
    extraFiles: [
      {
        ...webGALTerreRuntimeFiles,
        to: "resources/webgal-terre",
      },
    ],
    target: "AppImage",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  };
}

module.exports = createConfig;
