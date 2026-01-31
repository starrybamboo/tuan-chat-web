import { Api, HttpClient } from "@/webGAL/apis";
import { getTerreBaseUrl } from "./terreConfig";
import { createWebGalSyncClient, WebGalSyncClient } from "./webgalSync";

export { checkGameExist } from "./fileOperator";



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
function getWebGalSyncClient(): WebGalSyncClient {
  const baseUrl = getTerreBaseUrl();
  if (!_syncClient || _syncClientBaseUrl !== baseUrl) {
    _syncClient?.disconnect();
    _syncClientBaseUrl = baseUrl;
    _syncClient = createWebGalSyncClient(baseUrl);
  }
  return _syncClient;
}

