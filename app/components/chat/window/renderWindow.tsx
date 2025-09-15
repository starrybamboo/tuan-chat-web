import { SpaceContext } from "@/components/chat/spaceContext";
import launchWebGal from "@/utils/launchWebGal";
import { pollPort } from "@/utils/pollPort";
import { ChatRenderer } from "@/webGAL/chatRenderer";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useImmer } from "use-immer";

export interface RenderProps {
  spritePosition: "left" | "middle" | "right";
  useVocal: boolean; // 是否使用语音合成功能
  skipRegex?: string; // 跳过语句的正则表达式
  referenceAudio?: File; // 参考音频文件
}

/**
 * 渲染进度
 */
export interface RenderProcess {
  percent?: number;
  message?: string;
  subMessage?: string;
}

// 预设的正则表达式选项
const regexOptions = [
  {
    label: "不过滤",
    value: "",
    description: "所有消息都将被处理。",
  },
  {
    label: "过滤括号内容",
    value: "^[\\(（].*[\\)）]$",
    description: "跳过被中文或英文括号包裹的消息，常用于旁白。",
  },
];

export default function RenderWindow() {
  const spaceId = use(SpaceContext).spaceId ?? -1;
  const [renderProps, updateRenderProps] = useImmer<RenderProps>({
    spritePosition: "left",
    useVocal: false,
    skipRegex: "", // 初始化 skipRegex
  });
  const [isRendering, setIsRendering] = useState(false);
  const [renderProcess, setRenderProcess] = useState<RenderProcess>({});

  // 音频文件引用
  const audioFileRef = useRef<HTMLInputElement>(null);

  // 从localStorage初始化数据
  useEffect(() => {
    const savedProps = localStorage.getItem("renderProps");
    if (savedProps) {
      updateRenderProps(JSON.parse(savedProps));
    }
  }, [updateRenderProps]);

  async function handleRender() {
    // 保存数据到localStorage
    localStorage.setItem("renderProps", JSON.stringify(renderProps));
    setIsRendering(true);
    setRenderProcess({});
    launchWebGal();
    await pollPort(3001).catch(() => toast.error("WebGAL 启动失败"));
    try {
      const renderer = new ChatRenderer(spaceId, renderProps, (process) => {
        setRenderProcess(currentProcess => ({ // <-- Use the functional update form
          percent: Math.max(process.percent ?? 0, currentProcess.percent ?? 0),
          message: process.message ?? currentProcess.message,
          subMessage: process.subMessage ?? currentProcess.subMessage,
        }));
      });
      await renderer.initializeRenderer();
    }
    catch (error) {
      console.error("Rendering failed:", error);
    }
    setIsRendering(false);

    const webgalUrl = `http://localhost:3001/#/game/%20preview_${spaceId}`;
    window.open(webgalUrl, "");
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-base-content">渲染设置</h2>

      {/* 语音合成开关 */}
      <div className="form-control">
        <label className="label cursor-pointer justify-between p-0">
          <span className="label-text text-base-content font-medium">语音合成</span>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${renderProps.useVocal ? "text-primary" : "text-neutral"}`}>
              {renderProps.useVocal ? "ON" : "OFF"}
            </span>
            <input
              type="checkbox"
              className="toggle toggle-lg toggle-primary"
              checked={renderProps.useVocal}
              onChange={() => updateRenderProps((draft) => {
                draft.useVocal = !draft.useVocal;
              })}
            />
          </div>
        </label>
      </div>

      {
        renderProps.useVocal && (
          <div className="form-control space-y-2">
            <label className="label p-0">
              <span className="label-text text-base-content font-medium">参考音频 (可选)</span>
            </label>
            <div className="flex gap-2 w-full">
              <input
                ref={audioFileRef}
                type="file"
                accept="audio/*"
                className="file-input file-input-bordered flex-1"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    updateRenderProps((draft) => {
                      draft.referenceAudio = file;
                    });
                    toast.success(`已选择音频文件: ${file.name}`);
                  }
                }}
              />
              {renderProps.referenceAudio && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    updateRenderProps((draft) => {
                      draft.referenceAudio = undefined;
                    });
                    if (audioFileRef.current) {
                      audioFileRef.current.value = "";
                    }
                    toast.success("已清除参考音频");
                  }}
                >
                  清除
                </button>
              )}
            </div>
            {renderProps.referenceAudio && (
              <div className="text-sm text-base-content/70">
                已选择:
                {" "}
                {renderProps.referenceAudio.name}
              </div>
            )}
            <div className="text-xs text-base-content/50">
              上传参考音频文件，用于语音合成时的音色参考。支持 MP3、WAV 等格式。
            </div>
          </div>
        )
      }

      {/* 跳过语句的正则表达式输入 */}
      <div className="form-control space-y-2">
        <label className="label p-0">
          <span className="label-text text-base-content font-medium">忽略语句规则 (正则表达式)</span>
        </label>
        <div className="flex gap-2 w-full">
          <input
            type="text"
            placeholder="输入正则表达式或选择预设"
            className="input input-bordered flex-1"
            value={renderProps.skipRegex || ""}
            onChange={e => updateRenderProps((draft) => {
              draft.skipRegex = e.target.value;
            })}
          />
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn">预设</div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64">
              {regexOptions.map(option => (
                <li key={option.label}>
                  <a onClick={() => updateRenderProps((draft) => {
                    draft.skipRegex = option.value;
                  })}
                  >
                    <div className="flex flex-col items-start">
                      <strong>{option.label}</strong>
                      <span className="text-xs text-base-content/70">{option.description}</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 渲染按钮 */}
      <button
        onClick={handleRender}
        disabled={isRendering}
        className={`btn btn-primary w-full mt-2 ${isRendering ? "btn-disabled" : ""}`}
        type="button"
      >
        {isRendering ? "渲染中，请勿关闭此窗口" : "开始渲染"}
      </button>

      {/* 渲染进度显示区域 */}
      {isRendering && (
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-sm font-medium text-base-content">
            <span>{renderProcess.message || "准备中..."}</span>
            <span>
              {renderProcess.percent?.toFixed(1) ?? 0}
              %
            </span>
          </div>
          <progress
            className="progress progress-primary w-full"
            value={renderProcess.percent ?? 0}
            max="100"
          >
          </progress>
          {renderProcess.subMessage && (
            <p className="text-xs text-base-content/70 text-center h-4">
              {renderProcess.subMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
