import { GearSixIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { tuanchat } from "../../../api/instance";

type GeminiOutputMode = "text" | "image" | "text-and-image";
type GeminiThinkingLevel = "" | "minimal" | "high";

interface GeminiLabMessage {
  role: "system" | "user" | "assistant";
  content: unknown;
}

interface GeminiLabRequest {
  model: string;
  messages: GeminiLabMessage[];
  stream: false;
  temperature?: number;
  top_p?: number;
  max_completion_tokens?: number;
  seed?: number;
  [key: string]: unknown;
}

interface GeminiLabResponse {
  model?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string;
      media?: Array<{ image_url?: { url?: string } }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface GeminiLabFormState {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  referenceImageUrlsText: string;
  outputMode: GeminiOutputMode;
  aspectRatio: string;
  imageSize: string;
  temperatureText: string;
  topPText: string;
  maxCompletionTokensText: string;
  seedText: string;
  thinkingLevel: GeminiThinkingLevel;
  includeThoughts: boolean;
  extraJsonText: string;
}

interface GeminiLabPreset {
  id: string;
  label: string;
  description: string;
  form: GeminiLabFormState;
}

interface DraftRequestState {
  payload: GeminiLabRequest | null;
  preview: string;
  error: string;
  referenceCount: number;
}

const MODELS = [
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-image",
  "gemini-2.5-flash",
] as const;

const OUTPUTS: Array<{ value: GeminiOutputMode; label: string; desc: string }> = [
  { value: "text", label: "Text", desc: "只看文本回复" },
  { value: "image", label: "Image", desc: "只出图像" },
  { value: "text-and-image", label: "Text + Image", desc: "同时要文本和图像" },
];

const ASPECTS = ["1:1", "2:3", "3:2", "4:3", "4:5", "9:16", "16:9", "21:9"] as const;
const SIZES = ["512", "1K", "2K", "4K"] as const;
const PATCH_BLOCKLIST = new Set(["model", "messages", "stream", "temperature", "top_p", "max_completion_tokens", "seed"]);

const AI_STUDIO_DEFAULT_SETTINGS = {
  outputMode: "text-and-image" as GeminiOutputMode,
  aspectRatio: "1:1",
  imageSize: "1K",
  temperatureText: "",
  topPText: "",
  maxCompletionTokensText: "2048",
  seedText: "",
  thinkingLevel: "minimal" as GeminiThinkingLevel,
  includeThoughts: false,
  extraJsonText: "{}",
} satisfies Pick<
  GeminiLabFormState,
  | "outputMode"
  | "aspectRatio"
  | "imageSize"
  | "temperatureText"
  | "topPText"
  | "maxCompletionTokensText"
  | "seedText"
  | "thinkingLevel"
  | "includeThoughts"
  | "extraJsonText"
>;

const PRESETS: GeminiLabPreset[] = [
  {
    id: "poster",
    label: "海报生图",
    description: "中间写 prompt，右侧调 Run settings。",
    form: {
      ...AI_STUDIO_DEFAULT_SETTINGS,
      model: "gemini-3.1-flash-image-preview",
      systemPrompt: "你是一个严谨的视觉创意导演，输出要兼顾构图稳定性和商业完成度。",
      userPrompt: "生成一张未来感城市海报，主色青蓝，主体在画面中央，带清晰英文标题“NEON ARC”。",
      referenceImageUrlsText: "",
    },
  },
  {
    id: "edit",
    label: "参考图编辑",
    description: "参考图每行一个 URL，不需要你拼 messages 结构。",
    form: {
      ...AI_STUDIO_DEFAULT_SETTINGS,
      model: "gemini-3.1-flash-image-preview",
      systemPrompt: "你是一个图像编辑助手，优先保留主体轮廓一致性。",
      userPrompt: "保留主体构图，把背景改成雨夜霓虹街道，并提升电影感。",
      referenceImageUrlsText: "https://example.com/reference.png",
    },
  },
  {
    id: "text",
    label: "文本调参",
    description: "只测文本参数。",
    form: {
      ...AI_STUDIO_DEFAULT_SETTINGS,
      model: "gemini-3-flash-preview",
      systemPrompt: "你是一个提示词分析助手，回答要短、准、结构化。",
      userPrompt: "分析这段海报提示词哪些约束最影响构图稳定性，并给出三条修改建议。",
      referenceImageUrlsText: "",
    },
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseObject(text: string): Record<string, unknown> {
  if (!text.trim())
    return {};
  const parsed = JSON.parse(text);
  if (!isRecord(parsed))
    throw new TypeError("高级 JSON patch 必须是对象");
  const blocked = Object.keys(parsed).filter(key => PATCH_BLOCKLIST.has(key));
  if (blocked.length)
    throw new TypeError(`高级 JSON patch 不支持覆盖 ${blocked.join(", ")}`);
  return parsed;
}

function parseNumber(raw: string, label: string, options: { min?: number; max?: number; integer?: boolean } = {}) {
  if (!raw.trim())
    return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value))
    throw new TypeError(`${label} 必须是数字`);
  if (options.integer && !Number.isInteger(value))
    throw new TypeError(`${label} 必须是整数`);
  if (options.min != null && value < options.min)
    throw new TypeError(`${label} 不能小于 ${options.min}`);
  if (options.max != null && value > options.max)
    throw new TypeError(`${label} 不能大于 ${options.max}`);
  return value;
}

function parseUrls(text: string) {
  return Array.from(new Set(text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)));
}

function mergeRecords(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    next[key] = isRecord(next[key]) && isRecord(value) ? mergeRecords(next[key] as Record<string, unknown>, value) : value;
  }
  return next;
}

function buildPayload(form: GeminiLabFormState) {
  const refs = parseUrls(form.referenceImageUrlsText);
  if (!form.userPrompt.trim() && refs.length === 0)
    throw new TypeError("Prompt 不能为空，至少填写文字或参考图 URL");
  const messages: GeminiLabMessage[] = [];
  if (form.systemPrompt.trim())
    messages.push({ role: "system", content: form.systemPrompt.trim() });
  if (refs.length) {
    const content: Array<Record<string, unknown>> = [];
    if (form.userPrompt.trim())
      content.push({ type: "text", text: form.userPrompt.trim() });
    for (const url of refs) content.push({ type: "image_url", image_url: { url } });
    messages.push({ role: "user", content });
  }
  else {
    messages.push({ role: "user", content: form.userPrompt.trim() });
  }
  const payload: GeminiLabRequest = { model: form.model, messages, stream: false };
  const temperature = parseNumber(form.temperatureText, "temperature", { min: 0, max: 2 });
  const topP = parseNumber(form.topPText, "top_p", { min: 0, max: 1 });
  const maxCompletionTokens = parseNumber(form.maxCompletionTokensText, "max_completion_tokens", { min: 1, integer: true });
  const seed = parseNumber(form.seedText, "seed", { integer: true });
  if (temperature != null)
    payload.temperature = temperature;
  if (topP != null)
    payload.top_p = topP;
  if (maxCompletionTokens != null)
    payload.max_completion_tokens = maxCompletionTokens;
  if (seed != null)
    payload.seed = seed;
  const generationConfig: Record<string, unknown> = {
    responseModalities: form.outputMode === "text" ? ["TEXT"] : form.outputMode === "image" ? ["IMAGE"] : ["TEXT", "IMAGE"],
  };
  if (form.outputMode !== "text")
    generationConfig.imageConfig = { aspectRatio: form.aspectRatio, imageSize: form.imageSize };
  if (form.thinkingLevel || form.includeThoughts)
    generationConfig.thinkingConfig = { ...(form.thinkingLevel ? { thinkingLevel: form.thinkingLevel } : {}), ...(form.includeThoughts ? { includeThoughts: true } : {}) };
  payload.generationConfig = generationConfig;
  return { payload: mergeRecords(payload, parseObject(form.extraJsonText)) as GeminiLabRequest, refCount: refs.length };
}

function getErrorMessage(error: unknown) {
  if (isRecord(error) && isRecord(error.body)) {
    const nested = error.body.error;
    if (isRecord(nested) && typeof nested.message === "string" && nested.message.trim())
      return nested.message;
    if (typeof error.body.errMsg === "string" && error.body.errMsg.trim())
      return error.body.errMsg;
    if (typeof error.body.message === "string" && error.body.message.trim())
      return error.body.message;
  }
  if (error instanceof Error && error.message.trim())
    return error.message;
  return "请求失败";
}

function getAssistantText(response: GeminiLabResponse | null) {
  return response?.choices?.map(choice => choice.message?.content?.trim() ?? "").filter(Boolean).join("\n\n") ?? "";
}

function getImageUrls(response: GeminiLabResponse | null) {
  const urls = new Set<string>();
  for (const choice of response?.choices ?? []) {
    for (const item of choice.message?.media ?? []) {
      if (item.image_url?.url?.trim())
        urls.add(item.image_url.url.trim());
    }
  }
  return Array.from(urls);
}

export default function GeminiLabPage() {
  const [form, setForm] = useState<GeminiLabFormState>({ ...PRESETS[0].form });
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [response, setResponse] = useState<GeminiLabResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const draft = useMemo<DraftRequestState>(() => {
    try {
      const { payload, refCount } = buildPayload(form);
      return { payload, preview: JSON.stringify(payload, null, 2), error: "", referenceCount: refCount };
    }
    catch (error) {
      return { payload: null, preview: "", error: getErrorMessage(error), referenceCount: parseUrls(form.referenceImageUrlsText).length };
    }
  }, [form]);
  const assistantText = getAssistantText(response);
  const imageUrls = getImageUrls(response);
  const update = <K extends keyof GeminiLabFormState>(key: K, value: GeminiLabFormState[K]) => setForm(current => ({ ...current, [key]: value }));
  const applyPreset = (preset: GeminiLabPreset) => {
    setPresetId(preset.id);
    setForm({ ...preset.form });
    setErrorMessage("");
  };
  const handleRun = async () => {
    if (!draft.payload) {
      setErrorMessage(draft.error || "当前配置不可发送");
      toast.error(draft.error || "当前配置不可发送");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    setResponse(null);
    try {
      const result = await tuanchat.aiGatewayOpenAiController.chatCompletions(draft.payload as never) as GeminiLabResponse;
      setResponse(result);
      toast.success("Gemini 请求已完成");
    }
    catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    }
    finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="min-h-full bg-base-200 px-4 py-4 md:px-6">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <section className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200 px-3 py-1 text-sm text-base-content/80">
                <GearSixIcon className="size-4" />
                dev only
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Gemini Chat Lab</h1>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-base-content/70">
                  这里按
                  {" "}
                  <a className="link link-primary" href="https://aistudio.google.com/prompts/new_chat" target="_blank" rel="noreferrer">AI Studio Chat</a>
                  {" "}
                  的布局来做：中间是聊天工作区，右边是 Run settings。默认不需要手改 messages 结构体。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn btn-outline"
                disabled={!draft.preview}
                onClick={() => {
                  if (!draft.preview || typeof navigator === "undefined" || !navigator.clipboard) {
                    toast.error(draft.error || "当前环境不支持复制");
                    return;
                  }
                  void navigator.clipboard.writeText(draft.preview).then(() => toast.success("请求 JSON 已复制"));
                }}
              >
                复制请求 JSON
              </button>
              <button type="button" className={`btn btn-primary ${isSubmitting ? "btn-disabled" : ""}`} onClick={() => { void handleRun(); }}>
                {isSubmitting ? "Running..." : "Run"}
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-base-300 bg-base-100 shadow-sm">
              <div className="border-b border-base-300 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-medium text-base-content/60">Chat workspace</div>
                    <div className="mt-1 text-lg font-semibold">{form.model}</div>
                    <div className="mt-2 text-sm leading-6 text-base-content/65">{PRESETS.find(item => item.id === presetId)?.description}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${presetId === preset.id ? "border-primary bg-primary/10 text-primary" : "border-base-300 bg-base-200/70 text-base-content/75 hover:border-primary/30"}`}
                        onClick={() => applyPreset(preset)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5">
                <details className="rounded-2xl border border-base-300 bg-base-200/50">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
                    <span>System instructions</span>
                    <span className="text-xs text-base-content/55">可选折叠区</span>
                  </summary>
                  <div className="border-t border-base-300 px-4 py-4">
                    <textarea
                      className="textarea textarea-bordered min-h-[140px] w-full"
                      placeholder="例如：你是一个严谨的视觉创意导演。"
                      spellCheck={false}
                      value={form.systemPrompt}
                      onChange={event => update("systemPrompt", event.target.value)}
                    />
                  </div>
                </details>

                <div className="rounded-3xl border border-base-300 bg-base-200/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Prompt</div>
                      <div className="mt-1 text-xs text-base-content/60">主输入区对齐 AI Studio 聊天界面。</div>
                    </div>
                    <div className="badge badge-outline">
                      {draft.referenceCount}
                      {" "}
                      refs
                    </div>
                  </div>
                  <textarea
                    className="textarea textarea-bordered min-h-[220px] w-full text-base leading-7"
                    placeholder="在这里写你的 prompt。"
                    spellCheck={false}
                    value={form.userPrompt}
                    onChange={event => update("userPrompt", event.target.value)}
                  />
                </div>

                <div className="rounded-3xl border border-base-300 bg-base-200/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Reference media</div>
                      <div className="mt-1 text-xs text-base-content/60">每行一个 URL，内部会自动拼成多模态 user message。</div>
                    </div>
                    <div className="text-xs text-base-content/55">http(s) / data URL</div>
                  </div>
                  <textarea
                    className="textarea textarea-bordered min-h-[120px] w-full font-mono text-sm leading-6"
                    placeholder={"https://example.com/reference-1.png\nhttps://example.com/reference-2.png"}
                    spellCheck={false}
                    value={form.referenceImageUrlsText}
                    onChange={event => update("referenceImageUrlsText", event.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-base-300 bg-base-100 shadow-sm">
              <div className="border-b border-base-300 px-5 py-4">
                <div className="text-sm font-medium text-base-content/60">Output</div>
                <div className="mt-1 text-lg font-semibold">Model response</div>
              </div>
              <div className="space-y-4 px-5 py-5">
                {draft.error ? <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-6 text-warning-content">{draft.error}</div> : null}
                {errorMessage ? <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm leading-6 text-error">{errorMessage}</div> : null}
                {response?.usage
                  ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
                          <div className="text-xs uppercase tracking-wide text-base-content/55">prompt_tokens</div>
                          <div className="mt-1 text-xl font-semibold">{response.usage.prompt_tokens ?? "-"}</div>
                        </div>
                        <div className="rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
                          <div className="text-xs uppercase tracking-wide text-base-content/55">completion_tokens</div>
                          <div className="mt-1 text-xl font-semibold">{response.usage.completion_tokens ?? "-"}</div>
                        </div>
                        <div className="rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
                          <div className="text-xs uppercase tracking-wide text-base-content/55">total_tokens</div>
                          <div className="mt-1 text-xl font-semibold">{response.usage.total_tokens ?? "-"}</div>
                        </div>
                      </div>
                    )
                  : null}
                {response == null
                  ? (
                      <div className="rounded-3xl border border-dashed border-base-300 bg-base-200/30 px-6 py-10 text-center text-sm leading-7 text-base-content/55">
                        结果区先留空，行为上对齐 AI Studio。调好右侧 Run settings 后直接点 Run。
                      </div>
                    )
                  : (
                      <div className="space-y-4">
                        <div className="rounded-3xl border border-base-300 bg-base-200/50 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="text-sm font-medium">Assistant text</div>
                            {response.model ? <div className="badge badge-outline">{response.model}</div> : null}
                          </div>
                          <div className="min-h-[120px] whitespace-pre-wrap text-sm leading-7 text-base-content/85">{assistantText || "暂无文本输出"}</div>
                        </div>
                        <div className="rounded-3xl border border-base-300 bg-base-200/50 p-4">
                          <div className="mb-3 text-sm font-medium">Generated media</div>
                          {imageUrls.length
                            ? <div className="grid gap-3 lg:grid-cols-2">{imageUrls.map(url => <div key={url} className="overflow-hidden rounded-2xl border border-base-300 bg-base-100"><img src={url} alt="Gemini generated output" className="h-full w-full object-contain" /></div>)}</div>
                            : <div className="rounded-2xl border border-dashed border-base-300 px-4 py-6 text-sm text-base-content/55">这次没有图片输出。请检查右侧 Output mode 和 Image settings。</div>}
                        </div>
                      </div>
                    )}
              </div>
            </section>

            <details className="rounded-3xl border border-base-300 bg-base-100 shadow-sm">
              <summary className="cursor-pointer list-none px-5 py-4">
                <div className="text-sm font-medium">Raw request / response</div>
                <div className="mt-1 text-xs text-base-content/60">需要排查时再展开，不作为主交互。</div>
              </summary>
              <div className="grid gap-4 border-t border-base-300 px-5 py-5 xl:grid-cols-2">
                <pre className="overflow-x-auto rounded-2xl bg-neutral p-4 text-xs leading-6 text-neutral-content"><code>{draft.preview || draft.error || "暂无请求预览"}</code></pre>
                <pre className="max-h-[720px] overflow-auto rounded-2xl bg-neutral p-4 text-xs leading-6 text-neutral-content"><code>{response ? JSON.stringify(response, null, 2) : "暂无响应"}</code></pre>
              </div>
            </details>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <section className="rounded-3xl border border-base-300 bg-base-100 shadow-sm">
              <div className="border-b border-base-300 px-5 py-4">
                <div className="text-sm font-medium text-base-content/60">Run settings</div>
                <div className="mt-1 text-lg font-semibold">参数侧栏</div>
                <div className="mt-2 text-sm leading-6 text-base-content/65">常用设置直接调这里，不要再去改结构体。</div>
              </div>
              <div className="space-y-5 px-5 py-5">
                <div>
                  <label className="mb-2 block text-sm font-medium" htmlFor="gemini-lab-model">Model</label>
                  <select id="gemini-lab-model" className="select select-bordered w-full" value={form.model} onChange={event => update("model", event.target.value)}>
                    {MODELS.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Output mode</div>
                  <div className="grid gap-2">
                    {OUTPUTS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-2xl border px-3 py-3 text-left transition ${form.outputMode === option.value ? "border-primary bg-primary/10" : "border-base-300 bg-base-200/60 hover:border-primary/30"}`}
                        onClick={() => update("outputMode", option.value)}
                      >
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="mt-1 text-xs leading-6 text-base-content/65">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {form.outputMode !== "text"
                  ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                        <div>
                          <label className="mb-2 block text-sm font-medium" htmlFor="gemini-lab-aspect-ratio">Aspect ratio</label>
                          <select id="gemini-lab-aspect-ratio" className="select select-bordered w-full" value={form.aspectRatio} onChange={event => update("aspectRatio", event.target.value)}>
                            {ASPECTS.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium" htmlFor="gemini-lab-image-size">Image size</label>
                          <select id="gemini-lab-image-size" className="select select-bordered w-full" value={form.imageSize} onChange={event => update("imageSize", event.target.value)}>
                            {SIZES.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </div>
                      </div>
                    )
                  : null}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <label className="mb-2 block text-sm font-medium" htmlFor="gemini-lab-temperature">temperature</label>
                    <input id="gemini-lab-temperature" className="input input-bordered w-full" inputMode="decimal" placeholder="留空表示不上送" value={form.temperatureText} onChange={event => update("temperatureText", event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium" htmlFor="gemini-lab-top-p">top_p</label>
                    <input id="gemini-lab-top-p" className="input input-bordered w-full" inputMode="decimal" placeholder="留空表示不上送" value={form.topPText} onChange={event => update("topPText", event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium" htmlFor="gemini-lab-max-completion-tokens">max_completion_tokens</label>
                    <input id="gemini-lab-max-completion-tokens" className="input input-bordered w-full" inputMode="numeric" placeholder="例如 2048" value={form.maxCompletionTokensText} onChange={event => update("maxCompletionTokensText", event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium" htmlFor="gemini-lab-seed">seed</label>
                    <input id="gemini-lab-seed" className="input input-bordered w-full" inputMode="numeric" placeholder="例如 42" value={form.seedText} onChange={event => update("seedText", event.target.value)} />
                  </div>
                </div>
                <div className="grid gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium" htmlFor="gemini-lab-thinking-level">Thinking level</label>
                    <select id="gemini-lab-thinking-level" className="select select-bordered w-full" value={form.thinkingLevel} onChange={event => update("thinkingLevel", event.target.value as GeminiThinkingLevel)}>
                      <option value="">不显式指定</option>
                      <option value="minimal">minimal</option>
                      <option value="high">high</option>
                    </select>
                  </div>
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">includeThoughts</div>
                      <div className="mt-1 text-xs leading-6 text-base-content/60">只控制是否回传 thoughts。</div>
                    </div>
                    <input type="checkbox" className="toggle" checked={form.includeThoughts} onChange={event => update("includeThoughts", event.target.checked)} />
                  </label>
                </div>
                <details className="rounded-2xl border border-base-300 bg-base-200/40">
                  <summary className="list-none cursor-pointer px-4 py-3">
                    <div className="text-sm font-medium">Advanced JSON patch</div>
                    <div className="mt-1 text-xs leading-6 text-base-content/60">只在测试 tools、safety 或更深层 generationConfig 时使用。</div>
                  </summary>
                  <div className="border-t border-base-300 px-4 py-4">
                    <textarea className="textarea textarea-bordered min-h-[220px] w-full font-mono text-sm leading-6" spellCheck={false} value={form.extraJsonText} onChange={event => update("extraJsonText", event.target.value)} />
                    <div className="mt-3 rounded-2xl border border-base-300 bg-base-100 px-3 py-3 text-xs leading-6 text-base-content/65">
                      这里不能覆盖
                      {" "}
                      <code>model</code>
                      {" "}
                      /
                      {" "}
                      <code>messages</code>
                      {" "}
                      /
                      {" "}
                      <code>temperature</code>
                      {" "}
                      /
                      {" "}
                      <code>top_p</code>
                      {" "}
                      /
                      {" "}
                      <code>max_completion_tokens</code>
                      {" "}
                      /
                      {" "}
                      <code>seed</code>
                      ，这些请直接用上面的控件调。
                    </div>
                  </div>
                </details>
              </div>
            </section>

            <section className="rounded-3xl border border-base-300 bg-base-100 px-5 py-5 shadow-sm">
              <div className="text-sm font-medium text-base-content/60">Session summary</div>
              <div className="mt-3 grid gap-3">
                <div className="rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-base-content/55">system instructions</div>
                  <div className="mt-1 text-sm">{form.systemPrompt.trim() ? "已填写" : "未填写"}</div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-base-content/55">reference inputs</div>
                  <div className="mt-1 text-sm">{draft.referenceCount}</div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-base-content/55">request state</div>
                  <div className="mt-1 text-sm">{draft.error ? "配置待修正" : "可发送"}</div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
