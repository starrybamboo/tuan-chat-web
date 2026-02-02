// ============================================================================
// WebGAL Terre API Types
// 完整匹配 WebGAL Terre 后端的 API 类型定义
//
// 此文件基于 WebGAL_Terre 项目的 API 结构生成
// 参考: packages/origine2/src/api/Api.ts
// 参考: packages/terre2/src/Modules/
//
// API 分类:
// - App Controller: 基础信息接口 (/api/test, /api/osinfo)
// - Assets Controller: 资产管理接口 (/api/assets/*)
// - Manage Game Controller: 游戏管理接口 (/api/manageGame/*)
// - Manage Template Controller: 模板管理接口 (/api/manageTemplate/*)
// - Template Preview Controller: 模板预览接口 (/template-preview/*)
//
// WebSocket 端点:
// - /api/webgalsync - 游戏同步消息广播
// - /api/lsp2 - LSP (Language Server Protocol) 支持
// ============================================================================

// ===== App Types =====
export type OsInfoDto = {
  /** The platform of the operating system */
  platform: string;
  /** The architecture of the operating system */
  arch: string;
};

// ===== Assets Types =====
export type CreateNewFileDto = {
  /** The source path where the directory will be created */
  source: string;
  /** Name for the new file */
  name: string;
};

export type CreateNewFolderDto = {
  /** The source path where the directory will be created */
  source: string;
  /** Name for the new directory */
  name: string;
};

export type UploadFilesDto = {
  /** Target directory for the uploaded files */
  targetDirectory: string;
};

export type DeleteFileOrDirDto = {
  /** The source path of the file or directory to be deleted */
  source: string;
};

export type RenameFileDto = {
  /** The source path of the file or directory to be renamed */
  source: string;
  /** New name for renaming the file or directory */
  newName: string;
};

export type EditTextFileDto = {
  /** The path of textfile */
  path: string;
  /** Text data content */
  textFile: string;
};

// ===== Template Types =====
export type TemplateConfigDto = {
  /** The name of the template */
  "name": string;
  /** The id of the template */
  "id": string;
  /** The webgal version of the template */
  "webgal-version": string;
};

export type TemplateInfoDto = {
  /** The name of the template */
  "name": string;
  /** The id of the template */
  "id": string;
  /** The webgal version of the template */
  "webgal-version": string;
  /** The dir of the template */
  "dir": string;
};

export type CreateTemplateDto = {
  /** The name of the template to be created */
  templateName: string;
  /** The dir of the template */
  templateDir: string;
};

export type UpdateTemplateConfigDto = {
  /** The dir of the template */
  templateDir: string;
  /** The new config of the template */
  newTemplateConfig: TemplateConfigDto;
};

export type ApplyTemplateToGameDto = {
  /** The template name to apply */
  templateDir: string;
  /** The game name to be applied. */
  gameDir: string;
};

export type GetStyleByClassNameDto = {
  /** The name of class to be fetched */
  className: string;
  /** The path of stylesheet file to be fetched */
  filePath: string;
};

// ===== Game Types =====
export type GameInfoDto = {
  /** The name of the game */
  name: string;
  /** The dir of the game */
  dir: string;
  /** The cover of the game */
  cover: string;
  /** The template config of the game */
  template: TemplateConfigDto;
};

export type CreateGameDto = {
  /** The name of the game to be created */
  gameName: string;
  /** The dir of the game to be created */
  gameDir: string;
  /** The name of the derivative to be used */
  derivative?: string;
  /** The dir of the template to be applied */
  templateDir?: string;
};

export type EditFileNameDto = {
  /** The path to the file to be renamed */
  path: string;
  /** The new name for the file */
  newName: string;
};

export type DeleteFileDto = {
  /** The path to the file to be deleted */
  path: string;
};

export type CreateNewSceneDto = {
  /** The name of the game */
  gameName: string;
  /** The name of the scene */
  sceneName: string;
};

export type EditSceneDto = {
  /** The name of the game */
  gameName: string;
  /** The name of the scene */
  sceneName: string;
  /**
   * Scene data content
   * @format { value: string }
   */
  sceneData: string;
};

export type GameConfigDto = {
  /** The name of the game */
  gameName: string;
  /** New game configuration */
  newConfig: string;
};

export type MkDirDto = {
  /** The source path where the directory will be created */
  source: string;
  /** Name for the new directory */
  name: string;
};

export type DeleteDto = {
  /** The source path of the file or directory to be deleted */
  gameName: string;
};

export type RenameDto = {
  /** Old name for renaming the game */
  gameName: string;
  /** New name for renaming the game */
  newName: string;
};

export type IconsDto = {
  /** The icons of the game */
  platforms: string[];
};

// ===== Directory Info Types =====
type DirInfo = {
  name: string;
  isDir: boolean;
  extName?: string;
  path?: string;
};

export type ReadAssetsResponse = {
  readDirPath: string;
  dirPath: string;
  dirInfo: DirInfo[];
};

// ============================================================================
// HTTP Client
// ============================================================================

export type QueryParamsType = Record<string | number, any>;
export type FullRequestParams = {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  query?: QueryParamsType;
  body?: unknown;
  headers?: Record<string, string>;
  secure?: boolean;
};
export type ApiConfig = {
  baseURL?: string;
  securityWorker?: () => Promise<HeadersInit>;
};
export class HttpClient {
  private baseURL: string;
  private securityWorker?: () => Promise<HeadersInit>;
  constructor(config: ApiConfig = {}) {
    this.baseURL = config.baseURL || "";
    this.securityWorker = config.securityWorker;
  }

  private async mergeRequestParams(params: FullRequestParams): Promise<RequestInit> {
    const securityHeaders = this.securityWorker ? await this.securityWorker() : {};
    return {
      method: params.method,
      headers: {
        ...securityHeaders,
        ...params.headers,
        ...(params.body && typeof params.body === "object" && !(params.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: params.body instanceof FormData
        ? params.body
        : JSON.stringify(params.body),
    };
  }

  private buildUrl(path: string, query?: QueryParamsType): string {
    const url = new URL(path, this.baseURL);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, v));
        }
        else if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return url.toString();
  }

  public request = async <T = any>(params: FullRequestParams): Promise<T> => {
    const requestParams = await this.mergeRequestParams(params);
    const url = this.buildUrl(params.path, params.query);

    const response = await fetch(url, requestParams);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("Content-Type");
    if (contentType?.includes("application/json")) {
      return response.json();
    }
    return response.text() as Promise<T>;
  };
}

/**
 * @title WebGAL Terre API
 * @version 1.0
 * @contact
 *
 * 完整匹配 WebGAL Terre Editor 后端的 API
 */
type RequestParams = {
  secure?: boolean;
  headers?: Record<string, string>;
};

export class Api {
  private httpClient: HttpClient;
  constructor(protected http: HttpClient = new HttpClient()) {
    this.httpClient = http;
  }

  // ============================================================================
  // App Controller APIs
  // ============================================================================

  /**
   * API 测试接口
   */
  public appControllerApiTest(params: RequestParams = {}) {
    return this.httpClient.request<string>({
      path: `/api/test`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 获取操作系统信息
   */
  public appControllerGetOsInfo(params: RequestParams = {}) {
    return this.httpClient.request<OsInfoDto>({
      path: `/api/osinfo`,
      method: "GET",
      ...params,
    });
  }

  // ============================================================================
  // Assets Controller APIs
  // ============================================================================

  /**
   * 读取资产目录
   * @param readDirPath 目录路径
   */
  public assetsControllerReadAssets(readDirPath: string, params: RequestParams = {}) {
    return this.httpClient.request<ReadAssetsResponse>({
      path: `/api/assets/readAssets/${encodeURIComponent(readDirPath)}`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 打开资产目录（在系统文件管理器中）
   * @param dirPath 目录路径
   */
  public assetsControllerOpenDict(dirPath: string, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/assets/openDict/${encodeURIComponent(dirPath)}`,
      method: "POST",
      ...params,
    });
  }

  /**
   * 创建新文件
   * @param data 文件创建数据
   */
  public assetsControllerCreateNewFile(data: CreateNewFileDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/assets/createNewFile`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 创建新文件夹
   * @param data 文件夹创建数据
   */
  public assetsControllerCreateNewFolder(data: CreateNewFolderDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/assets/createNewFolder`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 上传文件
   * @param formData 包含文件的 FormData
   */
  public assetsControllerUpload(formData: FormData, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/assets/upload`,
      method: "POST",
      body: formData,
      ...params,
    });
  }

  /**
   * 删除文件或目录
   * @param data 删除数据
   */
  public assetsControllerDeleteFileOrDir(data: DeleteFileOrDirDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/assets/delete`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 重命名文件或目录
   * @param data 重命名数据
   */
  public assetsControllerRename(data: RenameFileDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/assets/rename`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 编辑文本文件
   * @param data 文本文件编辑数据
   */
  public assetsControllerEditTextFile(data: EditTextFileDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/assets/editTextFile`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  // ============================================================================
  // Manage Game Controller APIs
  // ============================================================================

  /**
   * 获取游戏列表
   */
  public manageGameControllerGetGameList(params: RequestParams = {}) {
    return this.httpClient.request<GameInfoDto[]>({
      path: `/api/manageGame/gameList`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 创建新游戏
   * @param data 游戏创建数据
   */
  public manageGameControllerCreateGame(data: CreateGameDto, params: RequestParams = {}) {
    return this.httpClient.request<{ status: string }>({
      path: `/api/manageGame/createGame`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 打开游戏目录（在系统文件管理器中）
   * @param gameName 游戏名称
   */
  public manageGameControllerOpenGameDict(gameName: string, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/openGameDict/${encodeURIComponent(gameName)}`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 获取派生引擎列表
   */
  public manageGameControllerGetDerivativeEngines(params: RequestParams = {}) {
    return this.httpClient.request<string[]>({
      path: `/api/manageGame/derivativeEngines`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 打开游戏资产目录
   * @param gameName 游戏名称
   * @param subFolder 子文件夹
   */
  public manageGameControllerOpenGameAssetsDict(
    gameName: string,
    subFolder: string,
    params: RequestParams = {},
  ) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/openGameAssetsDict/${encodeURIComponent(gameName)}`,
      method: "GET",
      query: { subFolder },
      ...params,
    });
  }

  /**
   * 导出游戏为 Web 应用
   * @param gameName 游戏名称
   */
  public manageGameControllerEjectGameAsWeb(gameName: string, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/ejectGameAsWeb/${encodeURIComponent(gameName)}`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 导出游戏为 EXE（Windows Electron 应用）
   * @param gameName 游戏名称
   */
  public manageGameControllerEjectGameAsExe(gameName: string, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/ejectGameAsExe/${encodeURIComponent(gameName)}`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 导出游戏为 Android 应用
   * @param gameName 游戏名称
   */
  public manageGameControllerEjectGameAsAndroid(gameName: string, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/ejectGameAsAndroid/${encodeURIComponent(gameName)}`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 读取游戏资产
   * @param readDirPath 目录路径
   */
  public manageGameControllerReadGameAssets(readDirPath: string, params: RequestParams = {}) {
    return this.httpClient.request<ReadAssetsResponse>({
      path: `/api/manageGame/readGameAssets/${encodeURIComponent(readDirPath)}`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 编辑文件名
   * @param data 文件名编辑数据
   */
  public manageGameControllerEditFileName(data: EditFileNameDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/editFileName`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 删除文件
   * @param data 文件删除数据
   */
  public manageGameControllerDeleteFile(data: DeleteFileDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/deleteFile`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 创建新场景
   * @param data 场景创建数据
   */
  public manageGameControllerCreateNewScene(data: CreateNewSceneDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/createNewScene`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 编辑场景
   * @param data 场景编辑数据
   */
  public manageGameControllerEditScene(data: EditSceneDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/editScene`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 编辑文本文件
   * @param data 文本文件编辑数据
   */
  public manageGameControllerEditTextFile(data: EditTextFileDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/editTextFile`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 获取游戏配置
   * @param gameName 游戏名称
   */
  public manageGameControllerGetGameConfig(gameName: string, params: RequestParams = {}) {
    return this.httpClient.request<string>({
      path: `/api/manageGame/getGameConfig/${encodeURIComponent(gameName)}`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 设置游戏配置
   * @param data 游戏配置数据
   */
  public manageGameControllerSetGameConfig(data: GameConfigDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/setGameConfig`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 上传文件到游戏目录
   * @param formData 包含文件的 FormData
   */
  public manageGameControllerUploadFiles(formData: FormData, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/uploadFiles`,
      method: "POST",
      body: formData,
      ...params,
    });
  }

  /**
   * 创建目录
   * @param data 目录创建数据
   */
  public manageGameControllerMkDir(data: MkDirDto, params: RequestParams = {}) {
    return this.httpClient.request<boolean>({
      path: `/api/manageGame/mkdir`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 删除游戏
   * @param data 删除数据
   */
  public manageGameControllerDelete(data: DeleteDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/delete`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 重命名游戏
   * @param data 重命名数据
   */
  public manageGameControllerRename(data: RenameDto, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageGame/rename`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 获取游戏图标
   * @param gameDir 游戏目录
   */
  public manageGameControllerGetIcons(gameDir: string, params: RequestParams = {}) {
    return this.httpClient.request<IconsDto>({
      path: `/api/manageGame/getIcons/${encodeURIComponent(gameDir)}`,
      method: "GET",
      ...params,
    });
  }

  // ============================================================================
  // Manage Template Controller APIs
  // ============================================================================

  /**
   * 获取模板列表
   */
  public manageTemplateControllerGetTemplateList(params: RequestParams = {}) {
    return this.httpClient.request<TemplateInfoDto[]>({
      path: `/api/manageTemplate/templateList`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 创建新模板
   * @param data 模板创建数据
   */
  public manageTemplateControllerCreateTemplate(data: CreateTemplateDto, params: RequestParams = {}) {
    return this.httpClient.request<{ status: string; message: string }>({
      path: `/api/manageTemplate/createTemplate`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 获取模板配置
   * @param templateDir 模板目录
   */
  public manageTemplateControllerGetTemplateConfig(templateDir: string, params: RequestParams = {}) {
    return this.httpClient.request<TemplateConfigDto>({
      path: `/api/manageTemplate/getTemplateConfig/${encodeURIComponent(templateDir)}`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 更新模板配置
   * @param data 模板配置更新数据
   */
  public manageTemplateControllerUpdateTemplateConfig(
    data: UpdateTemplateConfigDto,
    params: RequestParams = {},
  ) {
    return this.httpClient.request<{ status: string; message: string }>({
      path: `/api/manageTemplate/updateTemplateConfig`,
      method: "PUT",
      body: data,
      ...params,
    });
  }

  /**
   * 删除模板
   * @param templateDir 模板目录
   */
  public manageTemplateControllerDeleteTemplate(templateDir: string, params: RequestParams = {}) {
    return this.httpClient.request<void>({
      path: `/api/manageTemplate/delete/${encodeURIComponent(templateDir)}`,
      method: "DELETE",
      ...params,
    });
  }

  /**
   * 将模板应用到游戏
   * @param data 应用模板数据
   */
  public manageTemplateControllerApplyTemplateToGame(
    data: ApplyTemplateToGameDto,
    params: RequestParams = {},
  ) {
    return this.httpClient.request<void>({
      path: `/api/manageTemplate/applyTemplateToGame`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 根据类名获取样式
   * @param data 样式查询数据
   */
  public manageTemplateControllerGetStyleByClassName(
    data: GetStyleByClassNameDto,
    params: RequestParams = {},
  ) {
    return this.httpClient.request<string>({
      path: `/api/manageTemplate/getStyleByClassName`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  // ============================================================================
  // Template Preview Controller APIs
  // ============================================================================

  /**
   * 获取模板资产预览
   * @param path 资产路径
   * @param templateName 模板名称
   */
  public templatePreviewControllerGetTemplateAsset(
    path: string,
    templateName: string,
    params: RequestParams = {},
  ) {
    return this.httpClient.request<void>({
      path: `/template-preview/${encodeURIComponent(templateName)}/game/template/${encodeURIComponent(path)}`,
      method: "GET",
      ...params,
    });
  }
}
