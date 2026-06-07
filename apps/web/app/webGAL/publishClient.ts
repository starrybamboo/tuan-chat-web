import { resolveApiBaseUrl } from "../../api/instance";
import { fetchWithUnifiedAuth } from "../../api/unifiedAuthFetch";

export type WebgalPublishStatus = "pending" | "running" | "success" | "failed";

export type WebgalPublishJobStatus = {
  jobId: string;
  status: WebgalPublishStatus;
  deploymentUrl?: string;
  branchUrl?: string;
  errorMessage?: string;
};

export type WebgalPublishPackagePayloadFile = {
  path: string;
  content: string;
  contentType?: string;
  contentEncoding?: "utf8" | "base64";
};

export type WebgalPublishPackagePayload = {
  entrypoint: string;
  files: WebgalPublishPackagePayloadFile[];
};

export type StartWebgalPublishRequest = {
  spaceId: number;
  commitId?: number;
  packageData?: WebgalPublishPackagePayload;
};

type ApiResult<T> = {
  success?: boolean;
  errMsg?: string;
  data?: T;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildPublishUrl(path: string): string {
  const baseUrl = trimTrailingSlash(resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL) ?? "");
  return `${baseUrl}${path}`;
}

async function readPublishResponse(response: Response): Promise<WebgalPublishJobStatus> {
  let payload: ApiResult<WebgalPublishJobStatus> | null = null;
  try {
    payload = await response.json() as ApiResult<WebgalPublishJobStatus>;
  }
  catch {
    // 后端在网关错误时可能返回非 JSON，下面统一走 HTTP 状态错误。
  }

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.errMsg || response.statusText || "发布请求失败");
  }
  return payload.data;
}

export async function startWebgalPublish(request: StartWebgalPublishRequest): Promise<WebgalPublishJobStatus> {
  const response = await fetchWithUnifiedAuth(buildPublishUrl("/space/webgal/publish"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  return readPublishResponse(response);
}

export async function getWebgalPublishJob(jobId: string): Promise<WebgalPublishJobStatus> {
  const encodedJobId = encodeURIComponent(jobId);
  const response = await fetchWithUnifiedAuth(buildPublishUrl(`/space/webgal/publish/${encodedJobId}`));
  return readPublishResponse(response);
}
