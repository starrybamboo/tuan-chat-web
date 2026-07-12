const fs = require("fs");
const path = require("path");

const { withDangerousMod } = require("@expo/config-plugins");

const NETWORK_CONFIG_RESOURCE = "@xml/tuanchat_local_backend_network_security_config";
const NETWORK_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">127.0.0.1</domain>
    <domain includeSubdomains="false">10.0.2.2</domain>
    <domain includeSubdomains="false">localhost</domain>
  </domain-config>
</network-security-config>
`;

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function setManifestAttribute(applicationTag, name, value) {
  const attributePattern = new RegExp(`\\s${name}="[^"]*"`);
  if (attributePattern.test(applicationTag)) {
    return applicationTag.replace(attributePattern, ` ${name}="${value}"`);
  }

  return applicationTag.replace(/>$/, ` ${name}="${value}">`);
}

function removeManifestAttribute(applicationTag, name, value) {
  return applicationTag.replace(new RegExp(`\\s${name}="${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), "");
}

function patchAndroidManifest(androidRoot, enabled) {
  const manifestPath = path.join(androidRoot, "app/src/main/AndroidManifest.xml");
  let content = readFile(manifestPath);

  content = content.replace(/<application\b[^>]*>/, (applicationTag) => {
    if (enabled) {
      return setManifestAttribute(applicationTag, "android:networkSecurityConfig", NETWORK_CONFIG_RESOURCE);
    }

    return removeManifestAttribute(applicationTag, "android:networkSecurityConfig", NETWORK_CONFIG_RESOURCE);
  });

  writeFile(manifestPath, content);
}

function writeNetworkConfig(androidRoot, enabled) {
  const xmlDir = path.join(androidRoot, "app/src/main/res/xml");
  const xmlPath = path.join(xmlDir, "tuanchat_local_backend_network_security_config.xml");

  if (enabled) {
    fs.mkdirSync(xmlDir, { recursive: true });
    writeFile(xmlPath, NETWORK_CONFIG_XML);
    return;
  }

  if (fs.existsSync(xmlPath)) {
    fs.rmSync(xmlPath, { force: true });
  }
}

module.exports = function withAndroidLocalBackendNetwork(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const enabled = process.env.EXPO_PUBLIC_ENABLE_LOCAL_ACCOUNT_LOGIN === "1";

      writeNetworkConfig(androidRoot, enabled);
      patchAndroidManifest(androidRoot, enabled);

      return modConfig;
    },
  ]);
};
