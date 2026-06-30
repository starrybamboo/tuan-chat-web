const fs = require("fs");
const path = require("path");

const { withDangerousMod } = require("@expo/config-plugins");
const sharp = require("sharp");

const SPLASH_SOURCE_SIZE = 1024;
const SPLASH_BOX_DP = 216;
const SPLASH_CONTENT_DP = 107;
const DENSITIES = [
  ["mdpi", 1],
  ["hdpi", 1.5],
  ["xhdpi", 2],
  ["xxhdpi", 3],
  ["xxxhdpi", 4],
];
const SPLASH_XML = `<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item
    android:drawable="@drawable/splashscreen_logo_image"
    android:gravity="center" />
</layer-list>
`;

async function writeSplashDensityImages(resRoot, splashSource) {
  const contentSize = Math.round(SPLASH_SOURCE_SIZE * SPLASH_CONTENT_DP / SPLASH_BOX_DP);
  const sourcePng = await sharp(splashSource)
    .resize({
      width: contentSize,
      height: contentSize,
      fit: "inside",
      withoutEnlargement: false,
    })
    .extend({
      top: Math.floor((SPLASH_SOURCE_SIZE - contentSize) / 2),
      bottom: Math.ceil((SPLASH_SOURCE_SIZE - contentSize) / 2),
      left: Math.floor((SPLASH_SOURCE_SIZE - contentSize) / 2),
      right: Math.ceil((SPLASH_SOURCE_SIZE - contentSize) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  for (const [density, multiplier] of DENSITIES) {
    const densityRoot = path.join(resRoot, `drawable-${density}`);
    const outputSize = Math.round(SPLASH_BOX_DP * multiplier);
    fs.mkdirSync(densityRoot, { recursive: true });
    await sharp(sourcePng)
      .resize(outputSize, outputSize, { fit: "contain" })
      .png()
      .toFile(path.join(densityRoot, "splashscreen_logo_image.png"));
  }
}

module.exports = function withAndroidSplashLogo(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const resRoot = path.join(androidRoot, "app/src/main/res");
      const splashSourceRoot = path.join(projectRoot, "assets/images/android-splash");
      const splashSource = path.join(projectRoot, "assets/images/splash-icon.png");

      fs.mkdirSync(splashSourceRoot, { recursive: true });
      fs.writeFileSync(path.join(splashSourceRoot, "splashscreen_logo.xml"), SPLASH_XML, "utf8");
      await writeSplashDensityImages(resRoot, splashSource);

      return modConfig;
    },
  ]);
};
