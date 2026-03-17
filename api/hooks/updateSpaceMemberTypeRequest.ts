import { tuanchat } from "../instance";
import type { ApiRequestOptions } from "../core/ApiRequestOptions";
import type { ApiResultVoid } from "../models/ApiResultVoid";
import type { SpaceMemberTypeUpdateRequest } from "../models/SpaceMemberTypeUpdateRequest";

type SpaceMemberTypeUpdateController = {
  updateMemberType?: (requestBody: SpaceMemberTypeUpdateRequest) => PromiseLike<ApiResultVoid>;
};

type SpaceMemberTypeUpdateRequestDeps = {
  controller: SpaceMemberTypeUpdateController;
  request: {
    request: <T>(options: ApiRequestOptions) => PromiseLike<T>;
  };
};

const defaultDeps: SpaceMemberTypeUpdateRequestDeps = {
  controller: tuanchat.spaceMemberController as SpaceMemberTypeUpdateController,
  request: tuanchat.request,
};

export async function updateSpaceMemberTypeWithFallbackDeps(
  requestBody: SpaceMemberTypeUpdateRequest,
  deps: SpaceMemberTypeUpdateRequestDeps,
) {
  if (typeof deps.controller.updateMemberType === "function") {
    return await deps.controller.updateMemberType(requestBody);
  }

  // 兼容旧的运行时 API client：即使 spaceMemberController 还没带上新方法，也直接走同一路由。
  return await deps.request.request<ApiResultVoid>({
    method: "PUT",
    url: "/space/member/type",
    body: requestBody,
    mediaType: "application/json",
  });
}

export async function updateSpaceMemberTypeWithFallback(requestBody: SpaceMemberTypeUpdateRequest) {
  return await updateSpaceMemberTypeWithFallbackDeps(requestBody, defaultDeps);
}
