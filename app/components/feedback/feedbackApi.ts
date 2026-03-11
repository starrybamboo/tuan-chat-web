import type {
  FeedbackIssueArchiveUpdatePayload,
  FeedbackIssueCreatePayload,
  FeedbackIssueDetail,
  FeedbackIssueListFilters,
  FeedbackIssuePageResponse,
  FeedbackIssueStatusUpdatePayload,
} from "@/components/feedback/feedbackTypes";

type ApiResultPayload<T = unknown> = {
  success?: boolean;
  errMsg?: string;
  data?: T;
};

type QueryValue = string | number | boolean | null | undefined;

type FeedbackRequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: object;
  query?: Record<string, QueryValue>;
};

const FEEDBACK_ISSUE_BASE_PATH = "/feedback/issue";

function resolveBaseUrl() {
  const envBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (envBase) {
    return envBase.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const baseUrl = resolveBaseUrl();
  const url = new URL(
    `${baseUrl}${path}`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

function readErrorText(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (isRecord(payload)) {
    const errMsg = payload.errMsg;
    if (typeof errMsg === "string" && errMsg.trim()) {
      return errMsg.trim();
    }
  }

  return fallback;
}

function compactBody(body: object) {
  const nextBody: Record<string, unknown> = {};
  Object.entries(body).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    nextBody[key] = value;
  });
  return nextBody;
}

async function requestFeedbackApi<T>(
  path: string,
  options: FeedbackRequestOptions = {},
): Promise<T> {
  const token = typeof window === "undefined" ? null : localStorage.getItem("token");
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    credentials: "include",
    headers,
    body: options.body ? JSON.stringify(compactBody(options.body)) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(readErrorText(payload, `请求失败 (${response.status})`));
  }

  if (isRecord(payload)) {
    const result = payload as ApiResultPayload<T>;
    if (result.success === false) {
      throw new Error(readErrorText(payload, "请求失败"));
    }
    return result.data as T;
  }

  throw new Error("反馈接口返回了无效响应");
}

export function createFeedbackIssue(payload: FeedbackIssueCreatePayload) {
  return requestFeedbackApi<FeedbackIssueDetail>(FEEDBACK_ISSUE_BASE_PATH, {
    method: "POST",
    body: payload,
  });
}

export function pageFeedbackIssues(payload: FeedbackIssueListFilters & { cursor?: number }) {
  return requestFeedbackApi<FeedbackIssuePageResponse>(`${FEEDBACK_ISSUE_BASE_PATH}/page`, {
    method: "POST",
    body: payload,
  });
}

export function getFeedbackIssueDetail(feedbackIssueId: number) {
  return requestFeedbackApi<FeedbackIssueDetail>(`${FEEDBACK_ISSUE_BASE_PATH}/detail`, {
    query: { feedbackIssueId },
  });
}

export function updateFeedbackIssueStatus(payload: FeedbackIssueStatusUpdatePayload) {
  return requestFeedbackApi<FeedbackIssueDetail>(`${FEEDBACK_ISSUE_BASE_PATH}/status`, {
    method: "PUT",
    body: payload,
  });
}

export function updateFeedbackIssueArchive(payload: FeedbackIssueArchiveUpdatePayload) {
  return requestFeedbackApi<FeedbackIssueDetail>(`${FEEDBACK_ISSUE_BASE_PATH}/archive`, {
    method: "PUT",
    body: payload,
  });
}
