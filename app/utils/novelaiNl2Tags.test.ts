import { beforeEach, describe, expect, it, vi } from "vitest";

import { relayAiGatewayText } from "./aiRelay";
import { convertNaturalLanguageToNovelAiTags } from "./novelaiNl2Tags";

vi.mock("./aiRelay", () => {
  return {
    relayAiGatewayText: vi.fn(),
  };
});

const mockedRelayAiGatewayText = vi.mocked(relayAiGatewayText);

describe("convertNaturalLanguageToNovelAiTags", () => {
  beforeEach(() => {
    mockedRelayAiGatewayText.mockReset();
  });

  it("解析模型返回的 JSON prompt/negativePrompt", async () => {
    mockedRelayAiGatewayText.mockResolvedValue(
      "{\"prompt\":\"masterpiece, best quality, catgirl\",\"negativePrompt\":\"lowres, blurry\"}",
    );

    const result = await convertNaturalLanguageToNovelAiTags({ input: "一只可爱的猫娘" });

    expect(result.prompt).toBe("masterpiece, best quality, catgirl");
    expect(result.negativePrompt).toBe("lowres, blurry");
  });

  it("当模型返回空 prompt 时，返回空 prompt 错误", async () => {
    mockedRelayAiGatewayText.mockResolvedValue(
      "{\"prompt\":\"\",\"negativePrompt\":\"content warning: disallowed minor-related content\"}",
    );

    await expect(convertNaturalLanguageToNovelAiTags({ input: "一只可爱的萝莉猫娘" }))
      .rejects
      .toThrow("NL→tags 转换失败：解析结果为空 prompt");
  });
});
