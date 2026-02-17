import { toast } from "react-hot-toast";

import { relayAiGatewayText } from "../../../utils/aiRelay";

/**
 * 补全
 * @param prompt
 * @param handleReceiveMessage 接收补全结果，如果返回 false，则停止接收。
 */
export async function sendLlmStreamMessage(prompt: string, handleReceiveMessage: (message: string) => boolean) {
  try {
    handleReceiveMessage("正在生成...");
    const content = await relayAiGatewayText({
      prompt,
    });
    handleReceiveMessage(content);
  }
  catch (error) {
    toast.error(`API请求错误: ${error}`);
    handleReceiveMessage("自动补全请求失败，请重试");
  }
}
