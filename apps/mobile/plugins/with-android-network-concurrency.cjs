const fs = require("fs");
const path = require("path");

const { withDangerousMod } = require("expo/config-plugins");

const OKHTTP_DEPENDENCY = '    implementation("com.squareup.okhttp3:okhttp:4.12.0")';
const OKHTTP_PROVIDER_IMPORT = "import com.facebook.react.modules.network.OkHttpClientProvider";
const DISPATCHER_IMPORT = "import okhttp3.Dispatcher";
const NETWORK_CLIENT_SETUP = `    OkHttpClientProvider.setOkHttpClientFactory {
      val dispatcher = Dispatcher().apply {
        // 进房会并发加载多个同源资源，扩大连接槽位以免用户发送在队列中等待。
        maxRequestsPerHost = 16
      }
      OkHttpClientProvider.createClientBuilder(applicationContext)
        .dispatcher(dispatcher)
        .build()
    }
`;

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function patchMainApplication(androidRoot) {
  const mainApplicationPath = path.join(androidRoot, "app/src/main/java/com/tuanchat/mobile/MainApplication.kt");
  let content = readFile(mainApplicationPath);

  if (!content.includes(OKHTTP_PROVIDER_IMPORT)) {
    content = content.replace(
      "import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint\n",
      `import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint\n${OKHTTP_PROVIDER_IMPORT}\n`,
    );
  }
  if (!content.includes(DISPATCHER_IMPORT)) {
    content = content.replace(
      "import expo.modules.ExpoReactHostFactory\n",
      `import expo.modules.ExpoReactHostFactory\n${DISPATCHER_IMPORT}\n`,
    );
  }
  if (!content.includes("maxRequestsPerHost = 16")) {
    content = content.replace(
      "    DefaultNewArchitectureEntryPoint.releaseLevel = try {\n",
      `${NETWORK_CLIENT_SETUP}    DefaultNewArchitectureEntryPoint.releaseLevel = try {\n`,
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

module.exports = function withAndroidNetworkConcurrency(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      patchMainApplication(androidRoot);
      patchAppBuildGradle(androidRoot);
      return modConfig;
    },
  ]);
};
