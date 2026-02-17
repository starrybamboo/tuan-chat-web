// NovelAI 自然语言 prompt → tags 工具：通过后端 LLM 将自然语言描述转换为适合 NovelAI 的 tags/negative tags。
import { relayAiGatewayText } from "./aiRelay";

export type NovelAiNl2TagsResult = {
  prompt: string;
  negativePrompt: string;
  raw: string;
};

function tryExtractJsonObject(text: string) {
  const input = String(text || "").trim();
  if (!input)
    return "";

  const fenceStart = input.indexOf("```");
  if (fenceStart >= 0) {
    const fenceEnd = input.indexOf("```", fenceStart + 3);
    if (fenceEnd > fenceStart) {
      const afterFence = input.slice(fenceStart + 3);
      const firstNewline = afterFence.indexOf("\n");
      const contentStart = firstNewline >= 0 ? fenceStart + 3 + firstNewline + 1 : fenceStart + 3;
      const content = input.slice(contentStart, fenceEnd).trim();
      if (content)
        return content;
    }
  }

  const first = input.indexOf("{");
  const last = input.lastIndexOf("}");
  if (first >= 0 && last > first)
    return input.slice(first, last + 1).trim();

  return "";
}

function normalizeTagsLine(input: string) {
  return String(input || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function convertNaturalLanguageToNovelAiTags(args: {
  input: string;
  negativeHint?: string;
}): Promise<NovelAiNl2TagsResult> {
  const userInput = String(args.input || "").trim();
  if (!userInput)
    throw new Error("请先填写自然语言描述");

  const negativeHint = String(args.negativeHint || "").trim();
  const safeUserInput = userInput.length > 2000 ? userInput.slice(0, 2000) : userInput;
  const safeNegativeHint = negativeHint.length > 500 ? negativeHint.slice(0, 500) : negativeHint;

  const promptText = [
    "你是 NovelAI 绘画提示词工程师。请把用户的自然语言描述转换为适合 NovelAI 的英文 tag 列表（逗号分隔）。",
    "要求：",
    "1) 只输出 JSON，不要输出任何额外文字/解释/Markdown。",
    "2) JSON 结构固定为：{\"prompt\":\"...\",\"negativePrompt\":\"...\"}。",
    "3) prompt 必须是英文 tags，逗号分隔，可包含 NovelAI 常用质量词（如 masterpiece, best quality）。",
    "4) negativePrompt 也必须是英文 tags，逗号分隔；如果用户没有要求，可给出常见负面词（如 lowres, blurry）。",
    "",
    `用户描述：${safeUserInput}`,
    safeNegativeHint ? `用户不希望出现：${safeNegativeHint}` : "",
  ].filter(Boolean).join("\n");

  const raw = (await relayAiGatewayText({
    prompt: promptText,
  })).trim();
  if (!raw)
    throw new Error("NL→tags 转换失败：后端未返回内容");

  const jsonText = tryExtractJsonObject(raw);
  if (jsonText) {
    let parsed: { prompt?: unknown; negativePrompt?: unknown };
    try {
      parsed = JSON.parse(jsonText) as { prompt?: unknown; negativePrompt?: unknown };
    }
    catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`NL→tags 转换失败：无法解析 JSON（${message}）`);
    }

    const prompt = normalizeTagsLine(String(parsed?.prompt ?? ""));
    const negativePrompt = normalizeTagsLine(String(parsed?.negativePrompt ?? ""));
    if (!prompt) {
      throw new Error("NL→tags 转换失败：解析结果为空 prompt");
    }
    return { prompt, negativePrompt, raw };
  }

  const fallbackPrompt = normalizeTagsLine(raw);
  if (!fallbackPrompt)
    throw new Error("NL→tags 转换失败：无法解析模型输出");
  return {
    prompt: fallbackPrompt,
    negativePrompt: normalizeTagsLine(negativeHint || "lowres, blurry, bad anatomy, extra fingers, worst quality"),
    raw,
  };
}
