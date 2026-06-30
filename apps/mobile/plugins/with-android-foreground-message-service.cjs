const fs = require("fs");
const path = require("path");

const { withDangerousMod } = require("@expo/config-plugins");

const TEMPLATE_DIR = "android-foreground-message-service";
const OKHTTP_DEPENDENCY = '    implementation("com.squareup.okhttp3:okhttp:4.12.0")';
const PACKAGE_IMPORT = "import com.tuanchat.mobile.foreground.TuanChatForegroundMessageServicePackage";
const SERVICE_IMPORT = "import com.tuanchat.mobile.foreground.TuanChatForegroundMessageService";
const PACKAGE_REGISTRATION = "          add(TuanChatForegroundMessageServicePackage())";
const VISIBILITY_REGISTRATION = "    TuanChatForegroundMessageService.registerAppVisibilityCallbacks(this)";
const ACTIVITY_VISIBILITY_IMPORT = "import com.tuanchat.mobile.foreground.TuanChatForegroundMessageService";
const ACTIVITY_VISIBILITY_HOOKS = `  override fun onResume() {
    super.onResume()
    TuanChatForegroundMessageService.markAppVisible("activity-resume")
  }

  override fun onPause() {
    TuanChatForegroundMessageService.markAppHidden("activity-pause")
    super.onPause()
  }

  override fun onUserLeaveHint() {
    TuanChatForegroundMessageService.markAppHidden("activity-user-leave")
    super.onUserLeaveHint()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      TuanChatForegroundMessageService.markAppVisible("activity-window-focus")
    }
    else {
      TuanChatForegroundMessageService.markAppHidden("activity-window-blur")
    }
  }

`;
const SERVICE_DECLARATION = '    <service android:name=".foreground.TuanChatForegroundMessageService" android:exported="false" android:foregroundServiceType="dataSync"/>';

const PERMISSIONS = [
  '  <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>',
  '  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC"/>',
  '  <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>',
  '  <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"/>',
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
  if (!content.includes(SERVICE_IMPORT)) {
    content = content.replace(
      `${PACKAGE_IMPORT}\n`,
      `${PACKAGE_IMPORT}\n${SERVICE_IMPORT}\n`,
    );
  }

  if (!content.includes(PACKAGE_REGISTRATION)) {
    content = content.replace(
      "          // add(MyReactNativePackage())\n",
      `          // add(MyReactNativePackage())\n${PACKAGE_REGISTRATION}\n`,
    );
  }
  if (!content.includes(VISIBILITY_REGISTRATION)) {
    content = content.replace(
      "    loadReactNative(this)\n",
      `    loadReactNative(this)\n${VISIBILITY_REGISTRATION}\n`,
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

function patchMainActivity(androidRoot) {
  const mainActivityPath = path.join(androidRoot, "app/src/main/java/com/tuanchat/mobile/MainActivity.kt");
  let content = readFile(mainActivityPath);

  if (!content.includes(ACTIVITY_VISIBILITY_IMPORT)) {
    content = content.replace(
      "import expo.modules.ReactActivityDelegateWrapper\n",
      `import expo.modules.ReactActivityDelegateWrapper\n${ACTIVITY_VISIBILITY_IMPORT}\n`,
    );
  }

  if (!content.includes("activity-window-blur")) {
    content = content.replace(
      "class MainActivity : ReactActivity() {\n",
      `class MainActivity : ReactActivity() {\n${ACTIVITY_VISIBILITY_HOOKS}`,
    );
  }

  writeFile(mainActivityPath, content);
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
      patchMainActivity(androidRoot);
      patchAppBuildGradle(androidRoot);
      patchAndroidManifest(androidRoot);

      return modConfig;
    },
  ]);
};
