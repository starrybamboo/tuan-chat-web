/**
 * @author: @starrybamboo
 * TTS API 接口类型定义和客户端,
 * 参考了他们官方提供的GUI进行封装。采用的是index-tts2的API规范。
 * 需要和群文件中的index-tts2整合包一起使用，整合包内有对应的后端服务，可以与这个对接。
 * index-tts2 在one-shot的情况下，表现非常优秀，情感迁移非常牛逼，唯一的问题是很吃显存，需要8G显存
 * https://github.com/index-tts/index-tts
 */
export type InferRequest = {
  /** 目标文本 */
  text: string;
  /** 音色参考音频本地路径,与 prompt_audio_base64 二选一 */
  prompt_audio_path?: string;
  /** 音色参考音频(PCM/WAV)的base64(带或不带data URI头) */
  prompt_audio_base64?: string;
  /** 情感控制方式枚举值: 0=同音色参考,1=情感参考音频,2=情感向量,3=情感描述文本 */
  emo_mode?: number;
  /** 情感参考音频路径 */
  emo_audio_path?: string;
  /** 情感参考音频base64 */
  emo_audio_base64?: string;
  /** 情感参考权重,emo_mode=1 有效 */
  emo_weight?: number;
  /** 长度8的情感向量,emo_mode=2 有效 */
  emo_vector?: number[];
  /** 情感描述文本,emo_mode=3 有效 */
  emo_text?: string;
  /** 是否随机情感 */
  emo_random?: boolean;
  /** 分句最大 token 数 */
  max_text_tokens_per_segment?: number;
  /** 是否采样 */
  do_sample?: boolean;
  /** top_p 参数 */
  top_p?: number;
  /** top_k 参数 */
  top_k?: number;
  /** 温度参数 */
  temperature?: number;
  /** 长度惩罚 */
  length_penalty?: number;
  /** beam 数量 */
  num_beams?: number;
  /** 重复惩罚 */
  repetition_penalty?: number;
  /** 最大 Mel token 数 */
  max_mel_tokens?: number;
  /** 是否在 JSON 中直接返回 base64 编码音频 */
  return_audio_base64?: boolean;
};

export type InferResponse = {
  /** 响应代码 */
  code: number;
  /** 响应消息 */
  msg: string;
  /** 响应数据 */
  data?: {
    /** 生成的音频文件路径 */
    audio_path?: string;
    /** 推理耗时(秒) */
    inference_time?: number;
    /** 文件大小(字节) */
    file_size?: number;
    /** base64 编码的音频数据 */
    audio_base64?: string;
  };
};

export type SegmentRequest = {
  /** 需要分句的文本 */
  text: string;
  /** 分句最大 token 数 */
  max_text_tokens_per_segment?: number;
};

export type SegmentResponse = {
  /** 响应代码 */
  code: number;
  /** 响应消息 */
  msg: string;
  /** 响应数据 */
  data?: {
    /** 分句结果 */
    segments: Array<{
      /** 索引 */
      index: number;
      /** 内容 */
      content: string;
      /** token 数量 */
      token_count: number;
    }>;
  };
};

export type HealthResponse = {
  /** 响应代码 */
  code: number;
  /** 响应消息 */
  msg: string;
  /** 响应数据 */
  data?: {
    /** 服务状态 */
    status: string;
  };
};

export type DebugResponse = {
  /** 响应代码 */
  code: number;
  /** 响应消息 */
  msg: string;
  /** 响应数据 */
  data?: {
    /** 模型是否已加载 */
    model_loaded: boolean;
    /** PyTorch 版本 */
    torch_version: string;
    /** CUDA 是否可用 */
    cuda_available: boolean;
    /** GPU 数量 */
    gpu_count: number;
    /** 系统信息 */
    system_info?: string;
    /** 模型信息 */
    model_info?: {
      /** 模型版本 */
      model_version: string;
      /** 设备 */
      device: string;
    };
    /** GPU 信息 */
    gpu_info?: Array<{
      /** GPU ID */
      id: number;
      /** GPU 名称 */
      name: string;
      /** 总内存 */
      memory_total: number;
      /** 已分配内存 */
      memory_allocated: number;
      /** 缓存内存 */
      memory_cached: number;
    }>;
    /** 内存信息 */
    memory_info?: {
      /** 总内存 */
      total: number;
      /** 可用内存 */
      available: number;
      /** 内存使用百分比 */
      percent: number;
    };
    /** 磁盘空间 */
    disk_space?: {
      /** 总空间 */
      total: number;
      /** 可用空间 */
      free: number;
      /** 已使用空间 */
      used: number;
    };
  };
};

export type ModelInfoResponse = {
  /** 响应代码 */
  code: number;
  /** 响应消息 */
  msg: string;
  /** 响应数据 */
  data?: {
    /** 模型版本 */
    model_version?: string;
    /** GPT 最大文本 token 数 */
    gpt_max_text_tokens?: number;
    /** GPT 最大 Mel token 数 */
    gpt_max_mel_tokens?: number;
  };
};

export type ExampleItem = {
  /** 示例文本 */
  text?: string;
  /** 音色参考音频路径 */
  prompt_audio?: string;
  /** 音色参考音频 URL */
  prompt_audio_url?: string;
  /** 情感音频路径 */
  emo_audio?: string;
  /** 情感音频 URL */
  emo_audio_url?: string;
  /** 其他参数 */
  [key: string]: any;
};

export type ExamplesResponse = {
  /** 响应代码 */
  code: number;
  /** 响应消息 */
  msg: string;
  /** 响应数据 */
  data?: {
    /** 示例列表 */
    examples: ExampleItem[];
  };
};

export type EmoMode = {
  /** 情感模式 ID */
  id: number;
  /** 中文标签 */
  label: string;
  /** 英文标签 */
  en: string;
};

export type EmotionLabel = {
  /** 情感 ID */
  id: number;
  /** 中文标签 */
  label: string;
  /** 英文标签 */
  en: string;
};

export type ConfigResponse = {
  /** 响应代码 */
  code: number;
  /** 响应消息 */
  msg: string;
  /** 响应数据 */
  data?: {
    /** 模型版本 */
    model_version: string;
    /** 情感模式列表 */
    emo_modes: EmoMode[];
    /** 情感标签列表 */
    emotion_labels: EmotionLabel[];
    /** 限制配置 */
    limits: {
      /** 情感向量和最大值 */
      emo_vector_sum_max: number;
      /** 情感权重最大值 */
      emo_weight_max: number;
      /** 最大 Mel token 数 */
      max_mel_tokens: number;
      /** 最大文本 token 数 */
      max_text_tokens: number;
    };
    /** 默认配置 */
    defaults: {
      /** 默认分句最大 token 数 */
      max_text_tokens_per_segment: number;
      /** 默认情感权重 */
      emo_weight: number;
      /** 默认 top_p */
      top_p: number;
      /** 默认 top_k */
      top_k: number;
      /** 默认温度 */
      temperature: number;
      /** 默认是否采样 */
      do_sample: boolean;
      /** 默认长度惩罚 */
      length_penalty: number;
      /** 默认 beam 数 */
      num_beams: number;
      /** 默认重复惩罚 */
      repetition_penalty: number;
    };
    /** UI 配置 */
    ui_config: {
      /** 标题 */
      title: string;
      /** 副标题 */
      subtitle: string;
      /** 作者链接 */
      author_link: string;
      /** 作者名称 */
      author_name: string;
      /** 论文链接 */
      arxiv_link: string;
      /** 占位符配置 */
      placeholders: {
        /** 文本输入占位符 */
        text_input: string;
        /** 情感文本占位符 */
        emo_text: string;
        /** 情感文本示例 */
        emo_text_example: string;
      };
    };
  };
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

type RequestParams = {
  secure?: boolean;
  headers?: Record<string, string>;
};

/**
 * IndexTTS2 API 客户端
 * 提供文本转语音相关的 API 接口
 */
export class TTSApi {
  private httpClient: HttpClient;

  constructor(protected http: HttpClient = new HttpClient()) {
    this.httpClient = http;
  }

  /**
   * 健康检查
   * @returns 服务健康状态
   */
  public health(params: RequestParams = {}) {
    return this.httpClient.request<HealthResponse>({
      path: `/health`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 获取调试信息
   * @returns 系统调试信息
   */
  public debug(params: RequestParams = {}) {
    return this.httpClient.request<DebugResponse>({
      path: `/debug`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 获取模型信息
   * @returns 模型相关信息
   */
  public modelInfo(params: RequestParams = {}) {
    return this.httpClient.request<ModelInfoResponse>({
      path: `/model_info`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 文本转语音推理
   * @param data 推理请求参数
   * @returns 生成的音频信息
   */
  public infer(data: InferRequest, params: RequestParams = {}) {
    return this.httpClient.request<InferResponse>({
      path: `/infer`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 文本分句
   * @param data 分句请求参数
   * @returns 分句结果
   */
  public segment(data: SegmentRequest, params: RequestParams = {}) {
    return this.httpClient.request<SegmentResponse>({
      path: `/segment`,
      method: "POST",
      body: data,
      ...params,
    });
  }

  /**
   * 获取示例列表
   * @returns 示例数据
   */
  public examples(params: RequestParams = {}) {
    return this.httpClient.request<ExamplesResponse>({
      path: `/examples`,
      method: "GET",
      ...params,
    });
  }

  /**
   * 获取配置信息
   * @returns 系统配置
   */
  public config(params: RequestParams = {}) {
    return this.httpClient.request<ConfigResponse>({
      path: `/config`,
      method: "GET",
      ...params,
    });
  }
}

// 创建默认的 TTS API 实例
export function createTTSApi(baseURL: string = "http://localhost:9000") {
  const httpClient = new HttpClient({ baseURL });
  return new TTSApi(httpClient);
}

// 创建 TTS API 实例,从环境变量获取 URL
const TTS_API_URL = import.meta.env.VITE_TTS_URL || "http://localhost:9000";
export const ttsApi = createTTSApi(TTS_API_URL);
