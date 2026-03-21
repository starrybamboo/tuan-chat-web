import { tuanchat } from "../instance";
import type { ApiRequestOptions } from "../core/ApiRequestOptions";
import type { ApiResultVoid } from "../models/ApiResultVoid";
import type { LeaderTransferRequest } from "../models/LeaderTransferRequest";

type TransferLeaderController = {
  transferLeader?: (requestBody: LeaderTransferRequest) => PromiseLike<ApiResultVoid>;
};

type TransferLeaderRequestDeps = {
  controller: TransferLeaderController;
  request: {
    request: <T>(options: ApiRequestOptions) => PromiseLike<T>;
  };
};

const defaultDeps: TransferLeaderRequestDeps = {
  controller: tuanchat.spaceMemberController as TransferLeaderController,
  request: tuanchat.request,
};

export async function transferLeaderWithFallbackDeps(
  requestBody: LeaderTransferRequest,
  deps: TransferLeaderRequestDeps,
) {
  if (typeof deps.controller.transferLeader === "function") {
    return await deps.controller.transferLeader(requestBody);
  }

  // 兼容旧的运行时 API client：即使 spaceMemberController 还没带上新方法，也直接走同一路由。
  return await deps.request.request<ApiResultVoid>({
    method: "PUT",
    url: "/space/member/leader",
    body: requestBody,
    mediaType: "application/json",
  });
}

export async function transferLeaderWithFallback(requestBody: LeaderTransferRequest) {
  return await transferLeaderWithFallbackDeps(requestBody, defaultDeps);
}
