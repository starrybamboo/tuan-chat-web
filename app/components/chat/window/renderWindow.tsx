import { RoomContext } from "@/components/chat/roomContext";
import { ChatRenderer } from "@/webGAL/chatRenderer";
import { use, useEffect, useState } from "react";
import { useImmer } from "use-immer";

export interface RenderProps {
  spritePosition: "left" | "middle" | "right";
  useVocal: boolean; // 是否使用语音合成功能
  skipRegex?: string; // 跳过语句的正则表达式
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
  const roomContext = use(RoomContext);
  const roomId = roomContext?.roomId ?? -1;
  const [renderProps, updateRenderProps] = useImmer<RenderProps>({
    spritePosition: "left",
    useVocal: false,
    skipRegex: "", // 初始化 skipRegex
  });
  const [isRendering, setIsRendering] = useState(false);

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
    try {
      const renderer = new ChatRenderer(roomId, renderProps);
      await renderer.initializeRenderer();
    }
    catch (error) {
      console.error("Rendering failed:", error);
    }
    setIsRendering(false);

    const webgalUrl = `http://localhost:3001/#/game/%20preview_${roomId}`;
    window.open(webgalUrl, "");
  }

  return (
    <div className="card p-4 space-y-4 max-w-2xl mx-auto h-[30vh]">
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
        {isRendering ? "渲染中..." : "开始渲染"}
      </button>
    </div>
  );
}
