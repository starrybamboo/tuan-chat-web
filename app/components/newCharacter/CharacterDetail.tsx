import type { Transform } from "./sprite/TransformControl";
import type { Role } from "./types";
import { useUpdateRoleWithLocalMutation } from "api/queryHooks";
import { useEffect, useMemo, useRef, useState } from "react";
import CharacterAvatar from "./CharacterAvatar";
import ExpansionModule from "./rules/ExpansionModule";
import { RenderPreview } from "./sprite/RenderPreview";
import { TransformControl } from "./sprite/TransformControl";
// import Section from "./Section";

interface CharacterDetailProps {
  role: Role;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updatedRole: Role) => void;
}

/**
 * 角色详情组件
 */
export default function CharacterDetail({
  role,
  isEditing,
  onEdit,
  onSave,
}: CharacterDetailProps) {
  // 初始化角色数据
  const [localRole, setLocalRole] = useState<Role>(role);
  // 编辑状态过渡
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 字数统计：由描述派生，避免在 useEffect 中 setState
  const charCount = useMemo(() => localRole.description?.length || 0, [localRole.description]);
  // 描述的最大储存量
  const MAX_DESCRIPTION_LENGTH = 140;

  // 立绘预览相关状态
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    alpha: 1,
    rotation: 0,
  });

  // 立绘URL状态
  const [spriteUrl, setSpriteUrl] = useState<string | null>(null);

  // 当切换到不同角色时，更新本地状态（避免在 effect 中频繁 setState）
  useEffect(() => {
    setLocalRole(role);
  }, [role]);

  // 当立绘URL变化时，加载到预览Canvas
  useEffect(() => {
    if (spriteUrl && previewCanvasRef.current) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = spriteUrl;
      }
    }
  }, [spriteUrl, localRole.avatarId]);

  // 接口部分
  // 发送post数据部分,保存角色数据
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave);
  // 干净的文本
  const cleanText = (text: string) => {
    if (!text)
      return "";
    return text
      .replace(/\r\n/g, "\n") // 替换Windows换行符为Unix换行符
      .replace(/ {2,}/g, " ") // 压缩多个空格为单个空格
      .replace(/\n{2,}/g, "\n") // 压缩多个换行为单个换行
      .replace(/\s+$/g, ""); // 移除末尾空格
  };
  const handleSave = () => {
    setIsTransitioning(true);
    const cleanedRole = {
      ...localRole,
      name: cleanText(localRole.name),
      description: cleanText(localRole.description),
    };

    updateRole(cleanedRole, {
      onSuccess: () => {
        // 添加一个意义不明的延迟，故意浪费用户时间（不是
        setTimeout(() => {
          onSave(cleanedRole);
          setIsTransitioning(false);
        }, 300);
      },
      onError: () => {
        setIsTransitioning(false);
      },
    });
  };

  // 更新url和avatarId,方便更改服务器数据
  const handleAvatarChange = (previewUrl: string, avatarId: number) => {
    const updatedRole = {
      ...localRole,
      avatar: previewUrl,
      avatarId,
    };
    setLocalRole(updatedRole);
    const cleanedRole = {
      ...updatedRole,
      name: cleanText(localRole.name),
      description: cleanText(localRole.description),
    };
    updateRole(cleanedRole);
  };

  return (
    <div className={`space-y-6 transition-opacity duration-300 ease-in-out ${
      isTransitioning ? "opacity-50" : ""
    }`}
    >
      {/* 基础信息卡片 */}
      <div className={`card-sm md:card bg-base-100 shadow-xl ${
        isEditing ? "ring-2 ring-primary" : ""
      }`}
      >
        <div className="card-body">
          <div className="flex flex-col md:flex-row items-center">
            <CharacterAvatar
              role={localRole}
              onchange={handleAvatarChange}
              onSpritePreviewChange={url => setSpriteUrl(url)}
            />
            <div className="card-sm md:card flex-1 space-y-4 min-w-0 overflow-hidden p-2">
              {/* <Section title="基本信息"> */}

              {isEditing
                ? (
                    <div className="card-body">
                      <p className="text-lg">
                        角色名：
                      </p>
                      <input
                        type="text"
                        value={localRole.name}
                        onChange={e => setLocalRole(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="角色名称"
                        className="input input-bordered w-full text-lg font-bold mt-2"
                      />
                      <p className="text-lg mt-2">
                        描述：
                      </p>
                      <textarea
                        value={localRole.description}
                        onChange={(e) => {
                          setLocalRole(prev => ({ ...prev, description: e.target.value }));
                        }}
                        placeholder="角色描述"
                        className="textarea textarea-bordered w-full h-24 resize-none mt-2"
                      />
                      <div className="text-right mt-1">
                        <span className={`text-sm font-bold ${
                          charCount > MAX_DESCRIPTION_LENGTH
                            ? "text-error"
                            : "text-base-content/70"
                        }`}
                        >
                          {charCount}
                          /
                          {MAX_DESCRIPTION_LENGTH}
                          {charCount > MAX_DESCRIPTION_LENGTH && (
                            <span className="ml-2">(已超出描述字数上限)</span>
                          )}
                        </span>
                      </div>
                      <p>
                        角色ID号：
                        {localRole.id}
                      </p>
                    </div>
                  )
                : (
                    <>
                      <h2 className="font-semibold text-2xl md:text-3xl mt-4 text-center md:text-left">
                        {localRole.name || "未命名角色"}
                      </h2>
                      <div className="divider divider-start font-bold mt-0" />
                      <p className="text-base md:text-lg whitespace-pre-wrap break-words max-w-full overflow-hidden md:min-h-22">
                        {localRole.description || "暂无描述"}
                      </p>
                      <p className="text-xs">
                        角色ID号：
                        {localRole.id}
                        <br />
                        采用模型：
                        {localRole.modelName || "暂无描述"}
                        <br />
                        语音来源：
                        {localRole.speakerName || "暂无描述"}
                      </p>
                    </>
                  )}
              {/* </Section> */}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="card-actions justify-end">
            {isEditing
              ? (
                  <button
                    type="submit"
                    onClick={handleSave}
                    className={`btn btn-primary ${
                      isTransitioning ? "scale-95" : ""
                    }`}
                    disabled={isTransitioning}
                  >
                    {isTransitioning
                      ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        )
                      : (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            保存
                          </span>
                        )}
                  </button>
                )
              : (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="btn btn-accent"
                  >
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      编辑
                    </span>
                  </button>
                )}
          </div>
        </div>

      </div>
      <div className="card-sm md:card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="text-xl font-bold">渲染结果预览</h2>
          <div className="w-full p-3 gap-4 flex">
            <RenderPreview
              previewCanvasRef={previewCanvasRef}
              transform={transform}
              characterName={localRole.name || "未命名角色"}
              dialogContent="这是一段示例对话内容。"
            />
            <TransformControl
              transform={transform}
              setTransform={setTransform}
              previewCanvasRef={previewCanvasRef}
            />
          </div>
        </div>
      </div>
      <div className="card-sm md:card bg-base-100 shadow-xl">
        <ExpansionModule
          roleId={localRole.id}
        />
      </div>

    </div>
  );
}
