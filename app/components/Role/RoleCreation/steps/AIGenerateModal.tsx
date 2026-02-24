import { useState } from "react";

// AI生成的预览数据类型
interface AIGeneratedData {
  act?: Record<string, string>;
  basic?: Record<string, string>;
  ability?: Record<string, string>;
  skill?: Record<string, string>;
}

interface AIGenerateModalProps {
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
      <div className="collapse collapse-arrow bg-base-200/50 rounded-lg">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title text-sm font-medium">
          {title}
          {" "}
          (
          {Object.keys(data).length}
          {" "}
          项)
        </div>
        <div className="collapse-content">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs bg-base-100 rounded px-2 py-1">
                <span className="text-base-content/70">{key}</span>
                <span className="font-medium truncate max-w-[120px]" title={value}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen)
    return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl max-h-[85vh]">
        <form method="dialog">
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={handleClose}
          >
            ✕
          </button>
        </form>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 dark:from-purple-500 dark:to-pink-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
            <textarea
              className="textarea textarea-bordered rounded-md w-full min-h-[100px] bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
              placeholder="例如：一个来自北方的勇敢战士，擅长双手剑，有着保护弱者的坚定信念，曾经是皇家骑士团的成员..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
            <button
              type="button"
              className="btn btn-primary text-white rounded-md w-full bg-gradient-to-r from-purple-500 to-pink-400 dark:from-purple-600 dark:to-pink-600 border-none hover:from-purple-600 hover:to-pink-600 dark:hover:from-purple-700 dark:hover:to-pink-700"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || ruleId <= 0}
            >
              {isGenerating
                ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      AI生成中...
                    </>
                  )
                : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      开始生成
                    </>
                  )}
            </button>
          </div>

          {/* 预览区域 */}
          {previewData && (
            <div className="space-y-3">
              <div className="divider text-sm text-base-content/60">生成结果预览</div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {renderPreviewSection("角色表演能力", previewData.act)}
                {renderPreviewSection("基础能力值", previewData.basic)}
                {renderPreviewSection("计算能力值", previewData.ability)}
                {renderPreviewSection("技能设定", previewData.skill)}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline rounded-md flex-1"
                  onClick={() => setPreviewData(null)}
                >
                  重新生成
                </button>
                <button
                  type="button"
                  className="btn btn-success text-white rounded-md flex-1"
                  onClick={handleApply}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  应用数据
                </button>
              </div>
            </div>
          )}

          {/* 提示信息 */}
          {ruleId <= 0 && (
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm">请先选择规则后再使用AI生成功能</span>
            </div>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={handleClose}>关闭</button>
      </form>
    </dialog>
  );
}
