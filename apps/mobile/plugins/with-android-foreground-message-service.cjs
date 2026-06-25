const fs = require("fs");
const path = require("path");

const { withDangerousMod } = require("@expo/config-plugins");

const TEMPLATE_DIR = "android-foreground-message-service";
const OKHTTP_DEPENDENCY = '    implementation("com.squareup.okhttp3:okhttp:4.12.0")';
const PACKAGE_IMPORT = "import com.tuanchat.mobile.foreground.TuanChatForegroundMessageServicePackage";
const PACKAGE_REGISTRATION = "          add(TuanChatForegroundMessageServicePackage())";
const SERVICE_DECLARATION = '    <service android:name=".foreground.TuanChatForegroundMessageService" android:exported="false" android:foregroundServiceType="dataSync"/>';

const PERMISSIONS = [
  '  <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>',
  '  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC"/>',
  '  <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>',
];

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    }
    else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function patchMainApplication(androidRoot) {
  const mainApplicationPath = path.join(androidRoot, "app/src/main/java/com/tuanchat/mobile/MainApplication.kt");
  let content = readFile(mainApplicationPath);

  if (!content.includes(PACKAGE_IMPORT)) {
    content = content.replace(
      "import expo.modules.ExpoReactHostFactory\n",
      `import expo.modules.ExpoReactHostFactory\n${PACKAGE_IMPORT}\n`,
    );
  }

  if (!content.includes(PACKAGE_REGISTRATION)) {
    content = content.replace(
      "          // add(MyReactNativePackage())\n",
      `          // add(MyReactNativePackage())\n${PACKAGE_REGISTRATION}\n`,
    );
  }

  writeFile(mainApplicationPath, content);
}

function patchAppBuildGradle(androidRoot) {
  const buildGradlePath = path.join(androidRoot, "app/build.gradle");
  let content = readFile(buildGradlePath);
  if (content.includes(OKHTTP_DEPENDENCY)) {
    return;
  }

  content = content.replace(
    '    implementation("com.facebook.react:react-android")\n',
    `    implementation("com.facebook.react:react-android")\n${OKHTTP_DEPENDENCY}\n`,
  );
  writeFile(buildGradlePath, content);
}

function patchAndroidManifest(androidRoot) {
  const manifestPath = path.join(androidRoot, "app/src/main/AndroidManifest.xml");
  let content = readFile(manifestPath);

  for (const permission of PERMISSIONS) {
    if (!content.includes(permission)) {
      content = content.replace(
        '  <uses-permission android:name="android.permission.INTERNET"/>\n',
        `  <uses-permission android:name="android.permission.INTERNET"/>\n${permission}\n`,
      );
    }
  }

  if (!content.includes(SERVICE_DECLARATION)) {
    content = content.replace("  </application>", `${SERVICE_DECLARATION}\n  </application>`);
  }

  writeFile(manifestPath, content);
}

module.exports = function withAndroidForegroundMessageService(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const templateRoot = path.join(projectRoot, "plugins", TEMPLATE_DIR);

      copyDirectory(
        path.join(templateRoot, "java"),
        path.join(androidRoot, "app/src/main/java"),
      );
      copyDirectory(
        path.join(templateRoot, "res"),
        path.join(androidRoot, "app/src/main/res"),
      );
      patchMainApplication(androidRoot);
      patchAppBuildGradle(androidRoot);
      patchAndroidManifest(androidRoot);

      return modConfig;
    },
  ]);
};
