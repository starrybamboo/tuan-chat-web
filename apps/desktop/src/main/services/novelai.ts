import type {
  NovelAiClientSettingsRequest,
  NovelAiGenerateImageRequest,
  NovelAiGenerateImageResult,
} from "@tuanchat/electron-ipc";

import { base64DataUrl, detectBinaryDataUrl, firstImageFromZip, looksLikeZip } from "../utils/binaryDataUrl";
import { clampToMultipleOf64 } from "../utils/numberUtils";

function clamp01(input: unknown, fallback = 0.5) {
  const value = Number(input);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value));
}

export async function getNovelAiClientSettings(req: NovelAiClientSettingsRequest) {
  const token = String(req?.token || "").trim();
  if (!token) {
    throw new Error("缺少 NovelAI token（Bearer）");
  }

  const endpoint = String(req?.endpoint || "https://api.novelai.net").replace(/\/+$/, "");
  const url = `${endpoint}/user/clientsettings`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "authorization": `Bearer ${token}`,
      "accept": "application/json",
      "referer": "https://novelai.net/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`请求失败: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }

  const contentType = String(res.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    return await res.json();
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  }
  catch {
    return text;
  }
}

export async function generateNovelAiImage(req: NovelAiGenerateImageRequest): Promise<NovelAiGenerateImageResult> {
  const token = String(req?.token || "").trim();
  if (!token) {
    throw new Error("缺少 NovelAI token（Bearer）");
  }

  const endpoint = String(req?.endpoint || "https://image.novelai.net").replace(/\/+$/, "");
  const mode = String(req?.mode || "txt2img");
  const prompt = String(req?.prompt || "").trim();
  if (!prompt) {
    throw new Error("缺少 prompt");
  }

  const negativePrompt = String(req?.negativePrompt || "");
  const model = String(req?.model || "nai-diffusion-4-5-curated");
  const seed = Number.isFinite(req?.seed) ? Number(req.seed) : Math.floor(Math.random() * 2 ** 32);
  const steps = Number.isFinite(req?.steps) ? Math.max(1, Math.floor(Number(req.steps))) : 28;
  const scale = Number.isFinite(req?.scale) ? Number(req.scale) : 5;
  const sampler = String(req?.sampler || "k_euler_ancestral");
  const noiseSchedule = String(req?.noiseSchedule || "karras");
  const qualityToggle = Boolean(req?.qualityToggle);
  const normalizedSeed = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : Math.floor(Math.random() * 2 ** 32);
  const extraNoiseSeed = normalizedSeed > 0 ? normalizedSeed - 1 : 0;

  const width = clampToMultipleOf64(req?.width, 1024);
  const height = clampToMultipleOf64(req?.height, 1024);

  const isNAI3 = model === "nai-diffusion-3";
  const isNAI4 = (
    model === "nai-diffusion-4-curated-preview"
    || model === "nai-diffusion-4-full"
    || model === "nai-diffusion-4-full-inpainting"
    || model === "nai-diffusion-4-curated-inpainting"
    || model === "nai-diffusion-4-5-curated"
    || model === "nai-diffusion-4-5-curated-inpainting"
    || model === "nai-diffusion-4-5-full"
    || model === "nai-diffusion-4-5-full-inpainting"
  );
  const resolvedSampler = sampler === "k_euler_a" ? "k_euler_ancestral" : sampler;

  const v4Chars = Array.isArray(req?.v4Chars) ? req.v4Chars : [];
  const v4UseCoords = Boolean(req?.v4UseCoords);
  const v4UseOrder = req?.v4UseOrder == null ? true : Boolean(req.v4UseOrder);

  const parameters: Record<string, unknown> = {
    seed: normalizedSeed,
    width,
    height,
    n_samples: 1,
    steps,
    scale,
    sampler: resolvedSampler,
    negative_prompt: negativePrompt,
    ucPreset: 2,
    qualityToggle: mode === "infill" ? true : qualityToggle,
  };

  if (mode === "img2img") {
    const imageBase64 = String(req?.sourceImageBase64 || "").trim();
    if (!imageBase64) {
      throw new Error("img2img 缺少源图片（sourceImageBase64）");
    }
    const strength = Number.isFinite(req?.strength) ? Number(req.strength) : 0.7;
    const noise = Number.isFinite(req?.noise) ? Number(req.noise) : 0.2;
    parameters.image = imageBase64;
    parameters.strength = strength;
    parameters.noise = noise;
  }
  else if (mode === "infill") {
    const imageBase64 = String(req?.sourceImageBase64 || "").trim();
    const maskBase64 = String(req?.maskBase64 || "").trim();
    if (!imageBase64) {
      throw new Error("infill 缺少源图（sourceImageBase64）。");
    }
    if (!maskBase64) {
      throw new Error("infill 缺少蒙版（maskBase64）。");
    }
    const strength = Number.isFinite(req?.strength) ? Number(req.strength) : 0.7;
    const noise = Number.isFinite(req?.noise) ? Number(req.noise) : 0.2;
    parameters.image = imageBase64;
    parameters.mask = maskBase64;
    parameters.strength = Math.max(0, Math.min(1, strength));
    parameters.noise = Math.max(0, Math.min(1, noise));
    parameters.inpaintImg2ImgStrength = Math.max(0, Math.min(1, strength));
    parameters.img2img = {
      strength: parameters.inpaintImg2ImgStrength,
      color_correct: true,
    };
  }

  if (isNAI3 || isNAI4) {
    parameters.params_version = 3;
    parameters.noise_schedule = noiseSchedule;
    if (mode === "infill") {
      parameters.add_original_image = false;
      parameters.autoSmea = false;
      parameters.normalize_reference_strength_multiple = true;
      parameters.image_format = "png";
      parameters.stream = "msgpack";
      parameters.extra_noise_seed = extraNoiseSeed;
    }

    if (isNAI4) {
      const cfgRescale = Number.isFinite(req?.cfgRescale) ? Number(req.cfgRescale) : 0;
      const charCenters: Array<{ x: number; y: number }> = [];
      const charCaptionsPositive = v4Chars.map((item) => {
        const center = {
          x: clamp01(item?.centerX, 0.5),
          y: clamp01(item?.centerY, 0.5),
        };
        charCenters.push(center);
        return {
          char_caption: String(item?.prompt || ""),
          centers: [center],
        };
      });
      const charCaptionsNegative = v4Chars.map((item, idx) => {
        const center = charCenters[idx] || { x: 0.5, y: 0.5 };
        return {
          char_caption: String(item?.negativePrompt || ""),
          centers: [center],
        };
      });

      parameters.cfg_rescale = cfgRescale;
      parameters.characterPrompts = [];
      parameters.controlnet_strength = 1;
      parameters.deliberate_euler_ancestral_bug = false;
      parameters.prefer_brownian = true;
      parameters.reference_image_multiple = [];
      parameters.reference_information_extracted_multiple = [];
      parameters.reference_strength_multiple = [];
      parameters.skip_cfg_above_sigma = null;
      parameters.use_coords = mode === "infill" ? true : v4UseCoords;
      parameters.v4_prompt = {
        caption: {
          base_caption: prompt,
          char_captions: charCaptionsPositive,
        },
        use_coords: parameters.use_coords,
        use_order: v4UseOrder,
      };
      parameters.v4_negative_prompt = {
        caption: {
          base_caption: negativePrompt,
          char_captions: charCaptionsNegative,
        },
      };
    }
    else if (isNAI3) {
      const smea = Boolean(req?.smea);
      const smeaDyn = Boolean(req?.smeaDyn);
      parameters.sm_dyn = smeaDyn;
      parameters.sm = smea || smeaDyn;

      if (
        (resolvedSampler === "k_euler_ancestral" || resolvedSampler === "k_dpmpp_2s_ancestral")
        && noiseSchedule === "karras"
      ) {
        parameters.noise_schedule = "native";
      }
      if (resolvedSampler === "ddim_v3") {
        parameters.sm = false;
        parameters.sm_dyn = false;
        delete parameters.noise_schedule;
      }
      if (Number.isFinite(parameters.scale) && Number(parameters.scale) > 10) {
        parameters.scale = Number(parameters.scale) / 2;
      }
    }
  }

  const payload = {
    model,
    input: prompt,
    action: "generate",
    parameters,
  };

  const url = `${endpoint}/ai/generate-image`;
  const fetchImpl = globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TypeError("当前 Electron/Node 环境缺少 fetch 实现，无法请求 NovelAI");
  }

  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "referer": "https://novelai.net/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NovelAI 请求失败：${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 300)}` : ""}`);
  }

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const disposition = (res.headers.get("content-disposition") || "").toLowerCase();
  const buffer = new Uint8Array(await res.arrayBuffer());

  const isZip = contentType.includes("zip") || disposition.includes(".zip") || looksLikeZip(buffer);

  let dataUrl = detectBinaryDataUrl(buffer);
  if (isZip) {
    dataUrl = firstImageFromZip(buffer);
  }
  else if (contentType.startsWith("image/")) {
    dataUrl = base64DataUrl(contentType.split(";")[0] || "image/png", buffer);
  }
  else if (!dataUrl) {
    try {
      const text = new TextDecoder().decode(buffer);
      const maybeDataUrl = /data:\s*(data:\S+;base64,[A-Za-z0-9+/=]+)/.exec(text)?.[1];
      if (maybeDataUrl) {
        dataUrl = maybeDataUrl;
      }
      else {
        const maybeBase64 = /data:\s*([A-Za-z0-9+/=]+)\s*$/m.exec(text)?.[1];
        if (maybeBase64) {
          dataUrl = `data:image/png;base64,${maybeBase64}`;
        }
      }
    }
    catch {
      // ignore
    }
  }

  if (!dataUrl) {
    throw new Error(`NovelAI 返回了未知格式：content-type=${contentType || "unknown"}`);
  }

  return {
    dataUrl,
    seed,
    width,
    height,
    model,
  };
}
