import { Api, HttpClient } from "@/webGAL/apis";

import {
  checkGameExist,
  readTextFile,
} from "./fileOperator";
import { RealtimeRenderer } from "./realtimeRenderer";
import { getTerreBaseUrl } from "./terreConfig";
import { useRealtimeRender } from "./useRealtimeRender";
import { createWebGalSyncClient, WebGalSyncClient } from "./webgalSync";

// 导出类型
export type {
  // API 类型
  ApplyTemplateToGameDto,
  CreateGameDto,
  CreateNewFileDto,
  CreateNewFolderDto,
  CreateNewSceneDto,
  CreateTemplateDto,
  DeleteDto,
  DeleteFileDto,
  DeleteFileOrDirDto,
  DirInfo,
  EditFileNameDto,
  EditSceneDto,
  EditTextFileDto,
  GameConfigDto,
  GameInfoDto,
  GetStyleByClassNameDto,
  IconsDto,
  MkDirDto,
  OsInfoDto,
  ReadAssetsResponse,
  RenameDto,
  RenameFileDto,
  TemplateConfigDto,
  TemplateInfoDto,
  UpdateTemplateConfigDto,
  UploadFilesDto,
} from "./apis";

// 导出实时渲染 TTS 类型
export type { RealtimeTTSConfig } from "./realtimeRenderer";

// 导出 WebSocket 类型
export type {
  WebGalSyncMessage,
  WebGalSyncOptions,
  WebGalSyncStatus,
} from "./webgalSync";

// 导出类和函数
export {
  Api,
  checkGameExist,
  createWebGalSyncClient,
  HttpClient,
  readTextFile,
  RealtimeRenderer,
  useRealtimeRender,
  WebGalSyncClient,
};

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
