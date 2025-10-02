import { toast } from "react-hot-toast";

import { tuanchat } from "../../../../api/instance";

/**
 * 补全
 * @param prompt
 * @param handleReceiveMessage 接收补全结果，如果返回 false，则停止接收。
 */
export async function sendLlmStreamMessage(prompt: string, handleReceiveMessage: (message: string) => boolean) {
  try {
    handleReceiveMessage("正在生成...");
    const response = await tuanchat.aiWritingController.flash(prompt);
    handleReceiveMessage(response.data ?? "");
  }
  catch (error) {
    toast.error(`API请求错误: ${error}`);
    handleReceiveMessage("自动补全请求失败，请重试");
  }
}
