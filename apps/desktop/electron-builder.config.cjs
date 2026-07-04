const path = require("node:path");

const projectDir = __dirname;
const defaultWebGALTerreReleaseDir = path.resolve(projectDir, "..", "..", "..", "WebGAL_Terre", "release");

function resolveWebGALTerreReleaseDir() {
  const rawDir = String(process.env.WEBGAL_TERRE_RELEASE_DIR || defaultWebGALTerreReleaseDir).trim();
  if (!rawDir) {
    return defaultWebGALTerreReleaseDir;
  }

  return path.isAbsolute(rawDir) ? rawDir : path.resolve(projectDir, rawDir);
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

module.exports = {
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
  directories: {
    output: "../../release",
  },
  win: {
    extraFiles: [
      {
        ...webGALTerreRuntimeFiles,
        to: "resources/webgal-terre",
      },
    ],
    target: ["nsis", "zip"],
  },
  mac: {
    extraFiles: [
      {
        ...webGALTerreRuntimeFiles,
        to: "Resources/webgal-terre",
      },
    ],
    target: ["dmg", "zip"],
  },
  linux: {
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
