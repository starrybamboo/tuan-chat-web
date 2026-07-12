import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearVoiceboxProfileCache,
  ensureVoiceboxQwenCustomVoiceProfile,
  generateVoiceboxCustomVoice,
  normalizeVoiceboxBaseUrl,
} from "./api";

afterEach(() => {
  clearVoiceboxProfileCache();
  vi.unstubAllGlobals();
});

describe("VoiceBox API", () => {
  it("标准化为空或带尾斜杠的服务地址", () => {
    expect(normalizeVoiceboxBaseUrl()).toBe("http://127.0.0.1:17493");
    expect(normalizeVoiceboxBaseUrl("http://localhost:17493///")).toBe("http://localhost:17493");
  });

  it("复用已有 Qwen CustomVoice 预设 Profile", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      {
        id: "profile-serena",
        name: "Serena",
        language: "zh",
        voice_type: "preset",
        preset_engine: "qwen_custom_voice",
        preset_voice_id: "Serena",
        default_engine: "qwen_custom_voice",
      },
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const profile = await ensureVoiceboxQwenCustomVoiceProfile("http://127.0.0.1:17493", "Serena");

    expect(profile.id).toBe("profile-serena");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("缺少预设 Profile 时自动创建", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "profile-serena",
        name: "TuanChat CustomVoice Serena",
        language: "zh",
        voice_type: "preset",
        preset_engine: "qwen_custom_voice",
        preset_voice_id: "Serena",
        default_engine: "qwen_custom_voice",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const profile = await ensureVoiceboxQwenCustomVoiceProfile("http://127.0.0.1:17493", "Serena");

    const createRequest = fetchMock.mock.calls[1];
    const requestBody = JSON.parse(String((createRequest[1] as RequestInit).body));
    expect(profile.id).toBe("profile-serena");
    expect(createRequest[0]).toBe("http://127.0.0.1:17493/profiles");
    expect(requestBody).toMatchObject({
      name: "TuanChat CustomVoice Serena",
      language: "zh",
      voice_type: "preset",
      preset_engine: "qwen_custom_voice",
      preset_voice_id: "Serena",
      default_engine: "qwen_custom_voice",
    });
  });

  it("使用 0.6B CustomVoice 生成并下载 WAV 音频", async () => {
    const audioBytes = new Uint8Array([82, 73, 70, 70]);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          id: "profile-serena",
          name: "Serena",
          language: "zh",
          voice_type: "preset",
          preset_engine: "qwen_custom_voice",
          preset_voice_id: "Serena",
          default_engine: "qwen_custom_voice",
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "generation-1",
        status: "generating",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "generation-1",
        status: "completed",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(audioBytes, {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const audio = await generateVoiceboxCustomVoice({
      text: "你好，欢迎来到团剧共创。",
      voiceId: "Serena",
      language: "zh",
      instruct: "温柔、自然地讲述",
      pollIntervalMs: 0,
    });

    const generateRequest = fetchMock.mock.calls[1];
    const requestBody = JSON.parse(String((generateRequest[1] as RequestInit).body));
    expect(requestBody).toMatchObject({
      profile_id: "profile-serena",
      engine: "qwen_custom_voice",
      model_size: "0.6B",
      language: "zh",
      instruct: "温柔、自然地讲述",
    });
    expect(audio.type).toBe("audio/wav");
    expect(new Uint8Array(await audio.arrayBuffer())).toEqual(audioBytes);
  });

  it("生成任务失败时返回 VoiceBox 错误", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          id: "profile-serena",
          name: "Serena",
          language: "zh",
          voice_type: "preset",
          preset_engine: "qwen_custom_voice",
          preset_voice_id: "Serena",
          default_engine: "qwen_custom_voice",
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "generation-failed",
        status: "generating",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "generation-failed",
        status: "failed",
        error: "模型加载失败",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateVoiceboxCustomVoice({
      text: "测试失败状态",
      pollIntervalMs: 0,
    })).rejects.toThrow("VoiceBox 生成失败：模型加载失败");
  });

  it("缓存 Profile 被删除后会重建并重试生成", async () => {
    const audioBytes = new Uint8Array([82, 73, 70, 70]);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          id: "stale-profile",
          name: "Serena",
          language: "zh",
          voice_type: "preset",
          preset_engine: "qwen_custom_voice",
          preset_voice_id: "Serena",
          default_engine: "qwen_custom_voice",
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        detail: "Profile not found",
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "new-profile",
        name: "TuanChat CustomVoice Serena",
        language: "zh",
        voice_type: "preset",
        preset_engine: "qwen_custom_voice",
        preset_voice_id: "Serena",
        default_engine: "qwen_custom_voice",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "generation-retried",
        status: "completed",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(audioBytes, {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    await generateVoiceboxCustomVoice({
      text: "重新创建 Profile",
      pollIntervalMs: 0,
    });

    const firstGenerateBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    const retriedGenerateBody = JSON.parse(String((fetchMock.mock.calls[4][1] as RequestInit).body));
    expect(firstGenerateBody.profile_id).toBe("stale-profile");
    expect(retriedGenerateBody.profile_id).toBe("new-profile");
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});
