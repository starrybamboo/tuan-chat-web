import type { AiGatewayRelayRequest } from "../../api/models/AiGatewayRelayRequest";

import { tuanchat } from "../../api/instance";

export type AiGatewayModel = AiGatewayRelayRequest["model"];
export const FRONTEND_LLM_MODEL: AiGatewayModel = "gpt-5.1";

export async function relayAiGatewayText(params: {
  prompt: string;
}) {
  // 前端统一走 gpt-5.1，避免各处模型分叉导致未配置模型报错。
  const result = await tuanchat.aiGatewayController.relay({
    model: FRONTEND_LLM_MODEL,
    prompt: params.prompt,
  });

  if (!result?.success) {
    throw new Error(result?.errMsg || "AI网关中转请求失败");
  }

  return String(result?.data ?? "");
}

export const relayAiText = relayAiGatewayText;
