import type { Protocol } from "electron";

import fs from "node:fs";
import path from "node:path";

export function registerAppScheme(protocol: Protocol) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "app",
      privileges: {
        secure: true,
        standard: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

export function registerRendererFileProtocol(protocol: Protocol, rendererRoot: string) {
  protocol.registerFileProtocol("app", (request, callback) => {
    const url = request.url.substr("app://./".length);
    const filePath = path.join(rendererRoot, url);

    fs.stat(filePath, (err, stats) => {
      if (err) {
        callback({ path: path.join(rendererRoot, "index.html") });
        return;
      }

      if (stats.isDirectory()) {
        callback({ path: path.join(filePath, "index.html") });
      }
      else {
        callback({ path: filePath });
      }
    });
  });
}
