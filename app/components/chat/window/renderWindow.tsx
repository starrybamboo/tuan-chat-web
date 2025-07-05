import { RoomContext } from "@/components/chat/roomContext";
import { ChatRenderer } from "@/webGAL/chatRenderer";
import { use, useEffect, useState } from "react";
import { useImmer } from "use-immer";

export interface RenderProps {
  spritePosition: "left" | "middle" | "right";
  useVocal: boolean; // 是否使用语音合成功能
}

export default function RenderWindow() {
  const roomContext = use(RoomContext);
  const roomId = roomContext?.roomId ?? -1;
  const [renderProps, updateRenderProps] = useImmer<RenderProps>({
    spritePosition: "left",
    useVocal: false,
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
  }

  return (
    <div className="card bg-base-100 shadow-md p-6 space-y-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-base-content">渲染设置</h2>

      {/* <div className="form-control"> */}
      {/*  <label className="label"> */}
      {/*    <span className="label-text text-base-content pr-4">立绘位置</span> */}
      {/*  </label> */}
      {/*  <div className="join"> */}
      {/*    {(["left", "middle", "right"] as const).map(position => ( */}
      {/*      <input */}
      {/*        key={position} */}
      {/*        type="radio" */}
      {/*        name="avatarPosition" */}
      {/*        className="join-item btn" */}
      {/*        aria-label={position} */}
      {/*        checked={renderProps.spritePosition === position} */}
      {/*        onChange={() => updateRenderProps((draft) => { */}
      {/*          draft.spritePosition = position; */}
      {/*        })} */}
      {/*      /> */}
      {/*    ))} */}
      {/*  </div> */}
      {/* </div> */}

      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-4">
          <div className="flex flex-col">
            <span className="label-text text-base-content font-medium">语音合成</span>
          </div>
          <div className="flex items-center gap-2">
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

      <button
        onClick={handleRender}
        disabled={isRendering}
        className={`btn btn-primary w-full ${isRendering ? "btn-disabled" : ""}`}
        type="button"
      >
        {isRendering ? "渲染中..." : "开始渲染"}
      </button>
    </div>
  );
}
