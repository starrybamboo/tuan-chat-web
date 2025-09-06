import type { LLMProperty } from "@/components/settings/settingsPage";

import { getLocalStorageValue } from "@/components/common/customHooks/useLocalStorage";

/**
 * 补全
 * @param prompt
 * @param handleReceiveMessage 接收补全结果，如果返回 false，则停止接收。
 */
export async function sendLlmStreamMessage(prompt: string, handleReceiveMessage: (message: string) => boolean) {
  const llmSettings = getLocalStorageValue<LLMProperty>("llmSettings", {});
  const apiKey = llmSettings.openaiApiKey;
  const apiUrl = llmSettings.openaiApiBaseUrl ?? "";
  const model = llmSettings.openaiModelName;
  try {
    const response = await fetch(apiUrl, { /* ... fetch options ... */
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });
    if (!response.ok || !response.body) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const handleCallBack = (message: string) => {
      if (!handleReceiveMessage(message)) {
        reader.cancel();
        return false;
      }
      return true;
    };

    let fullMessage = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(line => line.trim() !== "");
      for (const line of lines) {
        if (line.startsWith("data:") && line !== "data: [DONE]") {
          try {
            const data = JSON.parse(line.substring(5));
            if (data.choices?.[0]?.delta?.content) {
              fullMessage += data.choices[0].delta.content;
              handleCallBack(fullMessage);
            }
          }
          catch (e) {
            console.error("解析流数据失败:", e);
          }
        }
      }
    }
  }
  catch (error) {
    console.error("API请求错误:", error);
    handleReceiveMessage("自动补全请求失败，请重试");
  }
}
