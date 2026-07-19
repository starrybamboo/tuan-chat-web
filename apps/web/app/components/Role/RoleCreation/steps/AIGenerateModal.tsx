import { useState } from "react";

import { appToast } from "@/components/common/appToast/appToast";
import { Button } from "@/components/common/Button";
import { DialogFrame } from "@/components/common/DialogFrame";
import { Disclosure } from "@/components/common/Disclosure";
import { TextArea } from "@/components/common/FormField";
import { Divider, InlineAlert } from "@/components/common/StatusPrimitives";

// AI生成的预览数据类型
type AIGeneratedData = {
  act?: Record<string, string>;
  basic?: Record<string, string>;
  ability?: Record<string, string>;
  skill?: Record<string, string>;
}

type AIGenerateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ruleId: number;
  onApply: (data: AIGeneratedData) => void;
  generateRoleByRule: (params: { ruleId: number; prompt: string }, options: { onSuccess: (data: any) => void; onError: (error: any) => void }) => void;
}

function toStringRecord(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return {};

  const out: Record<string, string> = {};
  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    out[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
  });
  return out;
}

export default function AIGenerateModal({
  isOpen,
  onClose,
  ruleId,
  onApply,
  generateRoleByRule,
}: AIGenerateModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<AIGeneratedData | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || ruleId <= 0)
      return;

    setIsGenerating(true);
    setPreviewData(null);

    try {
      const result = await new Promise<any>((resolve, reject) => {
        generateRoleByRule(
          { ruleId, prompt },
          {
            onSuccess: data => resolve(data),
            onError: error => reject(error),
          },
        );
      });

      const responseData = result?.data ?? {};
      const generatedData: AIGeneratedData = {
        act: toStringRecord(responseData.act),
        basic: toStringRecord(responseData.basic),
        ability: toStringRecord(responseData.属性 || responseData.ability),
        skill: toStringRecord(responseData.技能 || responseData.skill),
      };

      const hasAnySuccess = Boolean(
        Object.keys(generatedData.act ?? {}).length
        || Object.keys(generatedData.basic ?? {}).length
        || Object.keys(generatedData.ability ?? {}).length
        || Object.keys(generatedData.skill ?? {}).length,
      );

      if (!hasAnySuccess)
        throw new Error("AI生成失败：未返回有效数据");

      setPreviewData(generatedData);
    }
    catch (error) {
      console.error("AI生成失败:", error);
      appToast.error({
        title: "AI 生成失败",
        description: error instanceof Error && error.message.trim()
          ? error.message
          : "服务未返回有效角色数据。",
        details: "请调整提示词或检查网络后重试。",
      }, { id: "role-ai-generation" });
    }
    finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (previewData) {
      onApply(previewData);
      onClose();
      setPreviewData(null);
      setPrompt("");
    }
  };

  const handleClose = () => {
    onClose();
    setPreviewData(null);
    setPrompt("");
  };

  const renderPreviewSection = (title: string, data: Record<string, string> | undefined) => {
    if (!data || Object.keys(data).length === 0)
      return null;

    return (
      <Disclosure
        defaultOpen
        className="bg-base-200/50"
        titleClassName="text-sm font-medium"
        title={(
          <>
          {title}
          {" "}
          (
          {Object.keys(data).length}
          {" "}
          项)
          </>
        )}
      >
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="
                flex justify-between text-xs bg-base-100 rounded px-2 py-1
              ">
                <span className="text-base-content/70">{key}</span>
                <span className="font-medium truncate max-w-[120px]" title={value}>{value}</span>
              </div>
            ))}
          </div>
      </Disclosure>
    );
  };

  if (!isOpen)
    return null;

  return (
    <DialogFrame
      open={isOpen}
      mode="native"
      onClose={handleClose}
      ariaLabel="AI 智能生成角色"
      panelClassName="max-h-[85vh] max-w-2xl"
    >
        <div className="flex items-center gap-3 mb-4">
          <div className="
            flex size-12 items-center justify-center rounded-full bg-info text-info-content
          ">
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold">AI智能生成</h3>
            <p className="text-sm text-base-content/70">描述角色想法，AI将生成完整的角色属性</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 输入区域 */}
          <div className="space-y-2">
            <label htmlFor="ai-generate-prompt" className="block text-sm font-medium">
              生成提示词
            </label>
            <TextArea
              id="ai-generate-prompt"
              className="min-h-[100px]"
              autoComplete="off"
              aria-label="生成提示词"
              placeholder="例如：来自北方的勇敢战士，擅长双手剑"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
            <p className="text-xs text-base-content/60">
              将基于当前规则生成角色表演、基础能力、计算能力与技能字段。
            </p>
            <Button
              variant="primary"
              className="w-full rounded-md"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || ruleId <= 0}
              loading={isGenerating}
              icon={(
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
              title={
                !prompt.trim()
                  ? "请输入生成提示词"
                  : ruleId <= 0
                    ? "请选择规则后再生成"
                    : undefined
              }
            >
              {isGenerating ? "AI生成中..." : "开始生成"}
            </Button>
          </div>

          {/* 预览区域 */}
          {previewData && (
            <div className="space-y-3">
              <Divider>生成结果预览</Divider>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {renderPreviewSection("角色表演能力", previewData.act)}
                {renderPreviewSection("基础能力值", previewData.basic)}
                {renderPreviewSection("计算能力值", previewData.ability)}
                {renderPreviewSection("技能设定", previewData.skill)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-md flex-1"
                  onClick={() => setPreviewData(null)}
                >
                  重新生成
                </Button>
                <Button
                  variant="primary"
                  className="rounded-md flex-1"
                  aria-label="应用 AI 生成结果到角色"
                  onClick={handleApply}
                  icon={(
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                >
                  应用数据
                </Button>
              </div>
            </div>
          )}

          {/* 提示信息 */}
          {ruleId <= 0 && (
            <InlineAlert
              tone="warning"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="size-6 stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>}
            >
              <span className="text-sm">请先选择规则后再使用AI生成功能</span>
            </InlineAlert>
          )}
        </div>
    </DialogFrame>
  );
}
