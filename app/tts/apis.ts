export type GenerationParams = {
  do_sample: boolean;
  top_p: number;
  top_k?: number;
  temperature: number;
  length_penalty: number;
  num_beams: number;
  repetition_penalty: number;
  max_mel_tokens: number;
};

export type SegmentsRequest = {
  text: string;
  maxTextTokensPerSegment: number;
};

export type SegmentItem = {
  index: number;
  text: string;
  tokens: number;
};

export type SegmentsResponse = {
  segments: SegmentItem[];
};

export type TTSRequest = {
  promptFileId: string;
  text: string;
  emoControlMethod: number;
  emoRefFileId?: string;
  emoWeight: number;
  emoVec?: number[];
  emoText?: string;
  emoRandom: boolean;
  generation: GenerationParams;
  maxTextTokensPerSegment: number;
  async_mode: boolean;
};

export type TTSJobStatus = {
  jobId: string;
  status: string;
  progress: number;
  stage: string;
  audioUrl?: string;
  error?: string;
  created_at: number;
};

export type UploadResponse = {
  fileId: string;
};

export type HealthResponse = {
  status: string;
  model_version: string;
};

export type TTSResponse = {
  jobId: string;
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
 * @title IndexTTS Backend API
 * @version 0.1.0
 * @contact
 *
 * API Reference for IndexTTS Backend
 */
type RequestParams = {
  secure?: boolean;
  headers?: Record<string, string>;
};

export class TTSApi {
  private httpClient: HttpClient;

  constructor(protected http: HttpClient = new HttpClient()) {
    this.httpClient = http;
  }

  /**
   * 健康检查
   */
  public healthCheck(params: RequestParams = {}) {
    return this.httpClient.request<HealthResponse>({
      path: `/api/health`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 上传音频文件
   */
  public uploadFile(file: File, params: RequestParams = {}) {
    const formData = new FormData();
    formData.append("file", file);
    return this.httpClient.request<UploadResponse>({
      path: `/api/upload`,
      method: "POST",
      body: formData,
      ...params,
    });
  }

  /**
   * 文本分段
   */
  public getSegments(data: SegmentsRequest, params: RequestParams = {}) {
    return this.httpClient.request<SegmentsResponse>({
      path: `/api/segments`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 创建TTS任务
   */
  public createTTS(data: TTSRequest, params: RequestParams = {}) {
    if (data.async_mode) {
      return this.httpClient.request<TTSResponse>({
        path: `/api/tts`,
        method: "POST",
        body: data,
        ...params,
      });
    }
    else {
      // 同步模式返回音频文件
      return this.httpClient.request<Blob>({
        path: `/api/tts`,
        method: "POST",
        body: data,
        ...params,
      });
    }
  }

  /**
   * 获取TTS任务状态
   */
  public getTTSStatus(jobId: string, params: RequestParams = {}) {
    return this.httpClient.request<TTSJobStatus>({
      path: `/api/tts/${jobId}`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 获取所有TTS任务列表
   */
  public getTTSJobs(params: RequestParams = {}) {
    return this.httpClient.request<TTSJobStatus[]>({
      path: `/api/tts`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 下载生成的音频文件
   */
  public downloadFile(filename: string, params: RequestParams = {}) {
    return this.httpClient.request<Blob>({
      path: `/api/files/${filename}`,
      method: "GET",
      ...params,
    });
  }
}
