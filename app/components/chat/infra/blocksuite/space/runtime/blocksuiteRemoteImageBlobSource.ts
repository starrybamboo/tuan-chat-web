import type { BlobSource, BlobState } from "@blocksuite/sync";

import { IndexedDBBlobSource } from "@blocksuite/sync";
import { BehaviorSubject } from "rxjs";

import { normalizeMimeType } from "@/utils/mediaMime";
import { mediaFileUrl } from "@/utils/mediaUrl";
import { uploadMediaFile } from "@/utils/mediaUpload";
import { tuanchat } from "api/instance";

const DEFAULT_BLOCKSUITE_IMAGE_SCENE = 1 as const;

type ApiResult<T> = {
  success?: boolean;
  errMsg?: string;
  data?: T;
};

type MediaFileAliasResponse = {
  fileId?: number;
  mediaType?: string;
  status?: string;
};

function createDefaultBlobState(): BlobState {
  return {
    uploading: false,
    downloading: false,
    overSize: false,
    needDownload: false,
    needUpload: false,
  };
}

function normalizeBlobKey(key: string): string {
  return key
    .replace(/=+$/g, "")
    .replace(/[^\w-]/g, "_");
}

function isRemoteImageBlob(blob: Blob): boolean {
  return blob.type.startsWith("image/");
}

function extensionFromMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/png":
      return "png";
    default:
      return "bin";
  }
}

function toErrorMessage(prefix: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error ?? "");
  return detail ? `${prefix}: ${detail}` : prefix;
}

export function buildBlocksuiteRemoteImageFileName(key: string, mimeType = "image/png"): string {
  return `blocksuite-image-${normalizeBlobKey(key)}.${extensionFromMimeType(mimeType)}`;
}

export class BlocksuiteRemoteImageBlobSource implements BlobSource {
  readonly name: string;
  readonly readonly = false;

  private readonly _localSource: IndexedDBBlobSource;
  private readonly _scene: number;
  private readonly _states = new Map<string, BehaviorSubject<BlobState>>();
  private readonly _uploadTasks = new Map<string, Promise<boolean>>();
  private readonly _downloadTasks = new Map<string, Promise<Blob | null>>();

  constructor(params: { dbPrefix: string; scene?: number }) {
    this.name = `${params.dbPrefix}:remote-image`;
    this._localSource = new IndexedDBBlobSource(params.dbPrefix);
    this._scene = params.scene ?? DEFAULT_BLOCKSUITE_IMAGE_SCENE;
  }

  async get(key: string): Promise<Blob | null> {
    const localBlob = await this._localSource.get(key);
    if (localBlob) {
      return localBlob;
    }

    return await this._enqueueDownload(key);
  }

  async set(key: string, value: Blob): Promise<string> {
    await this._localSource.set(key, value);
    if (isRemoteImageBlob(value)) {
      void this._enqueueUpload(key, value);
    }
    else {
      this._nextState(key, { needUpload: false, errorMessage: null });
    }
    return key;
  }

  async delete(key: string): Promise<void> {
    await this._localSource.delete(key);
    this._states.get(key)?.complete();
    this._states.delete(key);
    this._uploadTasks.delete(key);
    this._downloadTasks.delete(key);
  }

  async list(): Promise<string[]> {
    return await this._localSource.list();
  }

  blobState$(key: string) {
    return this._ensureState(key).asObservable();
  }

  async upload(key: string): Promise<boolean> {
    const localBlob = await this._localSource.get(key);
    if (!localBlob) {
      this._nextState(key, {
        needUpload: true,
        errorMessage: "本地图片缓存不存在，无法重试上传",
      });
      return false;
    }
    if (!isRemoteImageBlob(localBlob)) {
      this._nextState(key, { needUpload: false, errorMessage: null });
      return false;
    }
    return await this._enqueueUpload(key, localBlob, { force: true });
  }

  private _ensureState(key: string): BehaviorSubject<BlobState> {
    let state$ = this._states.get(key);
    if (!state$) {
      state$ = new BehaviorSubject<BlobState>(createDefaultBlobState());
      this._states.set(key, state$);
    }
    return state$;
  }

  private _nextState(key: string, patch: Partial<BlobState>) {
    const state$ = this._ensureState(key);
    state$.next({ ...state$.value, ...patch });
  }

  private _enqueueUpload(key: string, blob: Blob, options?: { force?: boolean }): Promise<boolean> {
    const existing = this._uploadTasks.get(key);
    if (existing && !options?.force) {
      return existing;
    }

    const task = this._uploadImage(key, blob).finally(() => {
      if (this._uploadTasks.get(key) === task) {
        this._uploadTasks.delete(key);
      }
    });

    this._uploadTasks.set(key, task);
    return task;
  }

  private _enqueueDownload(key: string): Promise<Blob | null> {
    const existing = this._downloadTasks.get(key);
    if (existing) {
      return existing;
    }

    const task = this._downloadImage(key).finally(() => {
      if (this._downloadTasks.get(key) === task) {
        this._downloadTasks.delete(key);
      }
    });

    this._downloadTasks.set(key, task);
    return task;
  }

  private async _uploadImage(key: string, blob: Blob): Promise<boolean> {
    this._nextState(key, {
      uploading: true,
      needUpload: false,
      errorMessage: null,
    });

    try {
      const mimeType = normalizeMimeType(blob.type) || "image/png";
      const file = new File([blob], buildBlocksuiteRemoteImageFileName(key, mimeType), {
        type: mimeType,
      });
      const uploaded = await uploadMediaFile(file, { scene: this._scene });
      await this._upsertAlias(key, uploaded.fileId);

      this._nextState(key, {
        uploading: false,
        needUpload: false,
        errorMessage: null,
      });
      return true;
    }
    catch (error) {
      this._nextState(key, {
        uploading: false,
        needUpload: true,
        errorMessage: toErrorMessage("图片上传失败", error),
      });
      return false;
    }
  }

  private async _downloadImage(key: string): Promise<Blob | null> {
    this._nextState(key, {
      downloading: true,
      errorMessage: null,
    });

    try {
      const alias = await this._getAlias(key);
      if (!alias?.fileId) {
        return null;
      }
      const downloadUrl = mediaFileUrl(alias.fileId, alias.mediaType, "original");

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`图片下载返回 ${response.status}`);
      }

      const blob = await response.blob();
      await this._localSource.set(key, blob);
      this._nextState(key, {
        downloading: false,
        errorMessage: null,
      });
      return blob;
    }
    catch (error) {
      this._nextState(key, {
        downloading: false,
        errorMessage: toErrorMessage("图片下载失败", error),
      });
      return null;
    }
    finally {
      this._nextState(key, { downloading: false });
    }
  }

  private async _upsertAlias(key: string, fileId: number): Promise<void> {
    const result = await tuanchat.request.request<ApiResult<MediaFileAliasResponse>>({
      method: "POST",
      url: "/media/aliases",
      body: {
        namespace: this.name,
        aliasKey: key,
        fileId,
        expectedMediaType: "image",
      },
      mediaType: "application/json",
    });
    if (!result.success || !result.data?.fileId) {
      throw new Error(result.errMsg || "绑定图片远程索引失败");
    }
  }

  private async _getAlias(key: string): Promise<MediaFileAliasResponse | null> {
    const result = await tuanchat.request.request<ApiResult<MediaFileAliasResponse | null>>({
      method: "GET",
      url: "/media/aliases",
      query: {
        namespace: this.name,
        aliasKey: key,
      },
    });
    if (!result.success) {
      throw new Error(result.errMsg || "查询图片远程索引失败");
    }
    return result.data ?? null;
  }
}
