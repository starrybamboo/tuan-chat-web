import type { BlobSource, BlobState } from "@blocksuite/sync";

import { IndexedDBBlobSource } from "@blocksuite/sync";
import { BehaviorSubject } from "rxjs";

import type { OssUploadHeaders } from "@/utils/ossUploadTarget";

import { resolveOssUploadTarget } from "@/utils/ossUploadTarget";
import { tuanchat } from "api/instance";

const DEFAULT_BLOCKSUITE_IMAGE_SCENE = 1 as const;
const DEFAULT_UPLOAD_TIMEOUT_MS = 120_000;

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

function toErrorMessage(prefix: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error ?? "");
  return detail ? `${prefix}: ${detail}` : prefix;
}

export function buildBlocksuiteRemoteImageFileName(key: string): string {
  return `blocksuite-image-${normalizeBlobKey(key)}.bin`;
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
      const ossData = await tuanchat.ossController.getUploadUrl({
        fileName: buildBlocksuiteRemoteImageFileName(key),
        scene: this._scene,
        dedupCheck: true,
      });

      const uploadUrl = ossData.data?.uploadUrl?.trim();
      const downloadUrl = ossData.data?.downloadUrl?.trim();
      if (!downloadUrl) {
        throw new Error("获取图片下载地址失败");
      }

      if (uploadUrl) {
        await this._putBlob(uploadUrl, blob, ossData.data?.uploadHeaders);
      }

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
      const ossData = await tuanchat.ossController.getUploadUrl({
        fileName: buildBlocksuiteRemoteImageFileName(key),
        scene: this._scene,
        dedupCheck: true,
      });

      const uploadUrl = ossData.data?.uploadUrl?.trim();
      const downloadUrl = ossData.data?.downloadUrl?.trim();

      // dedup miss 说明远端对象不存在，不把它视为错误。
      if (!downloadUrl || uploadUrl) {
        return null;
      }

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

  private async _putBlob(url: string, blob: Blob, uploadHeaders?: OssUploadHeaders): Promise<void> {
    const { targetUrl, headers } = resolveOssUploadTarget(url, blob, uploadHeaders);
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), DEFAULT_UPLOAD_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        method: "PUT",
        body: blob,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`文件传输失败: ${response.status}`);
      }
    }
    finally {
      globalThis.clearTimeout(timeout);
    }
  }
}
