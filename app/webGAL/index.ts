import { Api, HttpClient } from "@/webGAL/apis";

import type { WebGalSyncClient } from "./webgalSync";

import { getTerreBaseUrl } from "./terreConfig";
import { createWebGalSyncClient } from "./webgalSync";

export { checkGameExist } from "./fileOperator";
export { PremiereExporter, type PremiereExportOptions } from "./premiereExporter";

let _terreApis: Api | null = null;
let _terreApisBaseUrl: string | null = null;
export function getTerreApis(): Api {
  const baseUrl = getTerreBaseUrl();
  if (!_terreApis || _terreApisBaseUrl !== baseUrl) {
    _terreApisBaseUrl = baseUrl;
    _terreApis = new Api(new HttpClient({ baseURL: baseUrl }));
  }
  return _terreApis;
}

// 创建 WebGAL Sync 客户端实例（懒加载）
let _syncClient: WebGalSyncClient | null = null;
let _syncClientBaseUrl: string | null = null;
export function getWebGalSyncClient(): WebGalSyncClient {
  const baseUrl = getTerreBaseUrl();
  if (!_syncClient || _syncClientBaseUrl !== baseUrl) {
    _syncClient?.disconnect();
    _syncClientBaseUrl = baseUrl;
    _syncClient = createWebGalSyncClient(baseUrl);
  }
  return _syncClient;
}
