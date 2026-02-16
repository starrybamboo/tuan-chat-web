import type { AiGatewayRelayRequest } from "../../api/models/AiGatewayRelayRequest";
import { tuanchat } from "../../api/instance";

export type AiGatewayModel = AiGatewayRelayRequest["model"];

export async function relayAiGatewayText(params: {
  model: AiGatewayModel;
  prompt: string;
}) {
  const result = await tuanchat.aiGatewayController.relay({
    model: params.model,
    prompt: params.prompt,
  });

  if (!result?.success) {
    throw new Error(result?.errMsg || "AI网关中转请求失败");
  }

  return String(result?.data ?? "");
}

export const relayAiText = relayAiGatewayText;
