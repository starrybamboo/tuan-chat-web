/**
 * GPT-SoVITS API 工具函数
 */

import type { TTSParams } from "./types";

/**
 * 检查API是否可用
 */
export async function checkAPIStatus(apiUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/control`, {
      method: "GET",
    });
    // API就绪时返回400状态码(根据Python GUI代码)
    return response.status === 400;
  }
  catch (error) {
    console.error("API检查失败:", error);
    return false;
  }
}

/**
 * 生成TTS音频
 */
export async function generateTTS(
  apiUrl: string,
  params: TTSParams,
): Promise<Blob> {
  const response = await fetch(`${apiUrl}/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS生成失败: ${error}`);
  }

  return await response.blob();
}

/**
 * 切换GPT模型
 */
export async function switchGPTModel(
  apiUrl: string,
  weightsPath: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${apiUrl}/set_gpt_weights?weights_path=${encodeURIComponent(weightsPath)}`,
      {
        method: "GET",
      },
    );

    if (response.ok) {
      return { success: true, message: "GPT模型切换成功" };
    }
    else {
      const error = await response.text();
      return { success: false, message: `GPT模型切换失败: ${error}` };
    }
  }
  catch (error) {
    return { success: false, message: `GPT模型切换时发生错误: ${error}` };
  }
}

/**
 * 切换SoVITS模型
 */
export async function switchSoVITSModel(
  apiUrl: string,
  weightsPath: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${apiUrl}/set_sovits_weights?weights_path=${encodeURIComponent(weightsPath)}`,
      {
        method: "GET",
      },
    );

    if (response.ok) {
      return { success: true, message: "SoVITS模型切换成功" };
    }
    else {
      const error = await response.text();
      return { success: false, message: `SoVITS模型切换失败: ${error}` };
    }
  }
  catch (error) {
    return { success: false, message: `SoVITS模型切换时发生错误: ${error}` };
  }
}

/**
 * 保存本地存储配置
 */
export function saveConfig(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  }
  catch (error) {
    console.error("保存配置失败:", error);
  }
}

/**
 * 读取本地存储配置
 */
export function loadConfig<T>(key: string, defaultValue: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  }
  catch (error) {
    console.error("读取配置失败:", error);
    return defaultValue;
  }
}
