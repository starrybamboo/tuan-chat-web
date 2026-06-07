import type { InitProgress, RealtimeRenderStatus } from "@/webGAL/useRealtimeRender";

export type RealtimeRenderRuntimeState = {
  status: RealtimeRenderStatus;
  initProgress: InitProgress | null;
  isActive: boolean;
  previewUrl: string | null;
};

export type RealtimeRenderRuntimeUpdate = {
  status?: RealtimeRenderStatus;
  initProgress?: InitProgress | null;
  isActive?: boolean;
  previewUrl?: string | null;
};

function hasOwnField<T extends object>(value: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function mergeRealtimeRenderRuntimeState(
  state: RealtimeRenderRuntimeState,
  runtime: RealtimeRenderRuntimeUpdate,
): RealtimeRenderRuntimeState {
  return {
    status: hasOwnField(runtime, "status") && runtime.status !== undefined ? runtime.status : state.status,
    initProgress: hasOwnField(runtime, "initProgress") && runtime.initProgress !== undefined ? runtime.initProgress : state.initProgress,
    isActive: hasOwnField(runtime, "isActive") && runtime.isActive !== undefined ? runtime.isActive : state.isActive,
    previewUrl: hasOwnField(runtime, "previewUrl") && runtime.previewUrl !== undefined ? runtime.previewUrl : state.previewUrl,
  };
}
