import type { ChatMessageResponse, Room, Space, UserRole } from "../../../../api";
import { useChatHistory } from "@/components/chat/indexedDB/useChatHistory";
import { SpaceContext } from "@/components/chat/spaceContext";
import launchWebGal from "@/utils/launchWebGal";
import { pollPort } from "@/utils/pollPort";
import { ChatRenderer } from "@/webGAL/chatRenderer";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useImmer } from "use-immer";
import { useGetSpaceInfoQuery, useGetUserRoomsQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetRolesQueries } from "../../../../api/queryHooks";

/**
 * 渲染参数
 */
export interface RenderProps {
  spritePosition: "left" | "middle" | "right";
  useVocal: boolean; // 是否使用语音合成功能
  skipRegex?: string; // 跳过语句的正则表达式
  roleAudios?: { [roleId: string]: File }; // 角色音频文件映射
}
/**
 * 渲染时候所必要的一些信息
 */
export interface RenderInfo {
  space: Space;
  rooms: Room[];
  roles: UserRole[];
  chatHistoryMap: Record<number, ChatMessageResponse[]>; // roomId to chatHistory
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

  const spaceInfo = useGetSpaceInfoQuery(spaceId).data?.data;

  const chatHistory = useChatHistory(null);
  const [chatHistoryMap, setChatHistoryMap] = useState<Record<number, ChatMessageResponse[]>>({});
  const getUserRoomsQuery = useGetUserRoomsQuery(spaceId);
  const rooms = useMemo(() => getUserRoomsQuery.data?.data ?? [], [getUserRoomsQuery.data?.data]);

  useEffect(() => {
    const getAllMessages = async () => {
      const map: Record<number, ChatMessageResponse[]> = {};
      for (const room of rooms) {
        map[room.roomId!] = await chatHistory.getMessagesByRoomId(room.roomId!);
      }
      setChatHistoryMap(map);
    };
    getAllMessages();
  }, [chatHistory, rooms]);
  const roleIds = useMemo(() => {
    const roleIds = new Set<number>();
    Object.values(chatHistoryMap)
      .flat()
      .map(m => m.message.roleId)
      .forEach(roleId => roleIds.add(roleId));
    return Array.from(roleIds);
  }, [chatHistoryMap]);

  // const roles = useGetRoomRolesQueries(rooms.map(r => r.roomId!))
  //   .map(q => q.data?.data ?? [])
  //   .flat();
  const roles = useGetRolesQueries(roleIds)
    .map(q => q.data?.data)
    .filter((role): role is UserRole => !!role);

  // 按voiceUrl是否为空排序，空的优先
  const sortedRoles = roles.sort((a, b) => {
    const aHasVoice = a.voiceUrl && a.voiceUrl.trim() !== "";
    const bHasVoice = b.voiceUrl && b.voiceUrl.trim() !== "";
    if (!aHasVoice && bHasVoice)
      return -1;
    if (aHasVoice && !bHasVoice)
      return 1;
    return 0;
  });

  const [renderProps, updateRenderProps] = useImmer<RenderProps>({
    spritePosition: "left",
    useVocal: false,
    skipRegex: "", // 初始化 skipRegex
    roleAudios: {}, // 初始化角色音频映射
  });
  const [isRendering, setIsRendering] = useState(false);
  const [renderProcess, setRenderProcess] = useState<RenderProcess>({});

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

    const renderInfo: RenderInfo = {
      space: spaceInfo!,
      rooms,
      roles,
      chatHistoryMap,
    };

    try {
      const renderer = new ChatRenderer(
        spaceId,
        renderProps,
        renderInfo,
        (process) => {
          setRenderProcess(currentProcess => ({ // <-- Use the functional update form
            percent: Math.max(process.percent ?? 0, currentProcess.percent ?? 0),
            message: process.message ?? currentProcess.message,
            subMessage: process.subMessage ?? currentProcess.subMessage,
          }));
        },
      );
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

      {renderProps.useVocal && (
        <>
          {/* 角色音频管理 */}
          <div className="form-control space-y-2">
            <label className="label p-0">
              <span className="label-text text-base-content font-medium">角色参考音频</span>
            </label>
            <div className="text-xs text-base-content/50 mb-2">
              为每个角色上传参考音频，用于语音合成时的音色参考。
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {sortedRoles.map((role) => {
                const hasVoiceUrl = role.voiceUrl && role.voiceUrl.trim() !== "";
                const hasUploadedAudio = renderProps.roleAudios?.[role.roleId];

                return (
                  <div
                    key={role.roleId}
                    className={`p-3 rounded-lg border ${
                      !hasVoiceUrl && !hasUploadedAudio
                        ? "border-warning bg-warning/10"
                        : "border-base-300 bg-base-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 w-full">
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-medium text-base-content max-w-[40%] truncate">{role.roleName || "未知角色"}</span>
                        {!hasVoiceUrl && !hasUploadedAudio && (
                          <div className="badge badge-warning badge-sm inline">缺少音频</div>
                        )}
                        {hasVoiceUrl && (
                          <div className="badge badge-success badge-sm inline">有原始音频</div>
                        )}
                        {hasUploadedAudio && (
                          <div className="badge badge-info badge-sm inline">已上传</div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="file"
                        accept="audio/*"
                        className="file-input file-input-bordered file-input-sm flex-1"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            updateRenderProps((draft) => {
                              if (!draft.roleAudios)
                                draft.roleAudios = {};
                              draft.roleAudios[role.roleId] = file;
                            });
                            toast.success(`已为角色 ${role.roleName || "未知角色"} 上传音频: ${file.name}`);
                          }
                        }}
                      />
                      {hasUploadedAudio && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            updateRenderProps((draft) => {
                              if (draft.roleAudios) {
                                delete draft.roleAudios[role.roleId];
                              }
                            });
                            toast.success(`已清除角色 ${role.roleName || "未知角色"} 的音频`);
                          }}
                        >
                          清除
                        </button>
                      )}
                    </div>

                    {hasUploadedAudio && (
                      <div className="text-xs text-base-content/70 mt-1">
                        已上传:
                        {" "}
                        {hasUploadedAudio.name}
                      </div>
                    )}

                    {!hasVoiceUrl && !hasUploadedAudio && (
                      <div className="text-xs text-warning mt-1">
                        警告: 此角色没有原始参考音频，建议上传一个音频文件。
                      </div>
                    )}
                  </div>
                );
              })}
              {sortedRoles.length === 0 && (
                <div className="text-center text-base-content/50 py-4">
                  暂无角色数据
                </div>
              )}
            </div>
          </div>
        </>
      )}

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
