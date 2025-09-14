import type {
  HealthResponse,
  SegmentsRequest,
  SegmentsResponse,
  TTSJobStatus,
  TTSRequest,
  TTSResponse,
  UploadResponse,
} from "./index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ttsApi } from "./index";

/**
 * 健康检查Hook
 */
export function useHealthCheck() {
  return useQuery<HealthResponse>({
    queryKey: ["tts", "health"],
    queryFn: () => ttsApi.healthCheck(),
    staleTime: 30000, // 30秒内不重新获取
  });
}

/**
 * 上传文件Hook
 */
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation<UploadResponse, Error, File>({
    mutationFn: (file: File) => ttsApi.uploadFile(file),
    onSuccess: () => {
      // 上传成功后可以invalidate相关查询
      queryClient.invalidateQueries({ queryKey: ["tts", "files"] });
    },
  });
}

/**
 * 文本分段Hook
 */
export function useSegments() {
  return useMutation<SegmentsResponse, Error, SegmentsRequest>({
    mutationFn: (data: SegmentsRequest) => ttsApi.getSegments(data),
  });
}

/**
 * 创建TTS任务Hook
 */
export function useCreateTTS() {
  const queryClient = useQueryClient();

  return useMutation<TTSResponse | Blob, Error, TTSRequest>({
    mutationFn: (data: TTSRequest) => ttsApi.createTTS(data),
    onSuccess: (data, variables) => {
      if (variables.async_mode && typeof data === "object" && "jobId" in data) {
        // 异步模式，invalidate任务列表
        queryClient.invalidateQueries({ queryKey: ["tts", "jobs"] });
      }
    },
  });
}

/**
 * 获取TTS任务状态Hook
 */
export function useTTSStatus(jobId: string | undefined, enabled = true) {
  return useQuery<TTSJobStatus>({
    queryKey: ["tts", "status", jobId],
    queryFn: () => ttsApi.getTTSStatus(jobId!),
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      // 如果任务还在进行中，每2秒刷新一次
      if (query.state.data?.status === "queued" || query.state.data?.status === "running") {
        return 2000;
      }
      return false;
    },
  });
}

/**
 * 获取所有TTS任务Hook
 */
export function useTTSJobs() {
  return useQuery<TTSJobStatus[]>({
    queryKey: ["tts", "jobs"],
    queryFn: () => ttsApi.getTTSJobs(),
    staleTime: 5000, // 5秒内不重新获取
  });
}

/**
 * 下载文件Hook
 */
export function useDownloadFile() {
  return useMutation<Blob, Error, string>({
    mutationFn: (filename: string) => ttsApi.downloadFile(filename),
  });
}

/**
 * 轮询TTS任务直到完成的Hook
 */
export function useTTSJobPolling(jobId: string | undefined) {
  const { data: status, isLoading, error } = useTTSStatus(jobId);

  const isCompleted = status?.status === "succeeded" || status?.status === "failed";
  const isInProgress = status?.status === "queued" || status?.status === "running";

  return {
    status,
    isLoading,
    error,
    isCompleted,
    isInProgress,
    isSucceeded: status?.status === "succeeded",
    isFailed: status?.status === "failed",
    progress: status?.progress || 0,
    stage: status?.stage || "",
    audioUrl: status?.audioUrl,
    errorMessage: status?.error,
  };
}
