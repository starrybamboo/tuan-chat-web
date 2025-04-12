/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export type CompletionDto = {
  /** Editor input value for which the completion is required */
  editorValue: string;
  /** Parameters required for completion */
  params: object;
};

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

export type getGameListResp = {
  name: string;
  isDir: boolean;
  extName: string;
  path: string;
};

export type EditTextFileDto = {
  /** The path of textfile */
  path: string;
  /** Text data content */
  textFile: string;
};

export type CreateGameDto = {
  /** The name of the game to be created */
  gameName: string;
  /** The name of the derivative to be used */
  derivative?: string;
  /** The name of the template to be applied */
  templateName: string;
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

export type CreateTemplateDto = {
  /** The name of the template to be created */
  templateName: string;
};

export type ApplyTemplateToGameDto = {
  /** The template name to apply */
  templateName: string;
  /** The game name to be applied. */
  gameName: string;
};

export type GetStyleByClassNameDto = {
  /** The name of class to be fetched */
  className: string;
  /** The path of stylesheet file to be fetched */
  filePath: string;
};

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
 * API Refrence of WebGAL Terre Editor
 */
type RequestParams = {
  secure?: boolean;
  headers?: Record<string, string>;
};

export class Api {
  public api: {
    [key: string]: (...args: any[]) => Promise<any>;
  };

  public templatePreview: {
    [key: string]: (...args: any[]) => Promise<any>;
  };

  constructor(protected http: HttpClient = new HttpClient()) {
    this.api = {
      appControllerApiTest: (params: RequestParams = {}) =>
        this.http.request({ path: `/api/test`, method: "GET", ...params }),
      lspControllerCompile: (data: CompletionDto) =>
        this.http.request<void>({
          path: `/api/lsp/compile`,
          method: "POST",
          body: data,
        }),
      assetsControllerReadAssets: (readDirPath: string) =>
        this.http.request<void>({
          path: `/api/assets/readAssets/${readDirPath}`,
          method: "GET",
        }),
      manageGameControllerGetGameList: () =>
        this.http.request<getGameListResp[]>({
          path: `/api/manageGame/gameList`,
          method: "GET",
        }),
      manageGameControllerCreateGame: (data: CreateGameDto) =>
        this.http.request<void>({
          path: `/api/manageGame/createGame`,
          method: "POST",
          body: data,
        }),
      manageGameControllerOpenGameDict: (gameName: string) =>
        this.http.request<void>({
          path: `/api/manageGame/openGameDict/${gameName}`,
          method: "GET",
        }),
      assetsControllerUpload: (data: FormData, targetDirectory: string) => {
        const formData = new FormData();
        formData.append("targetDirectory", targetDirectory);
        if (data instanceof File) {
          formData.append("files", data);
        }
        return this.http.request<void>({
          path: `/api/assets/upload`,
          method: "POST",
          body: formData,
        });
      },
    };
    this.templatePreview = {
      templatePreviewControllerGetTemplateAsset: (path: string, templateName: string) =>
        this.http.request<void>({
          path: `/template-preview/${templateName}/game/template/${path}`,
          method: "GET",
        }),
    };
  }
  /**
   * @title WebGAL Terre API
   * @version 1.0
   * @contact
   *
   * API Reference of WebGAL Terre Editor
   */
}
