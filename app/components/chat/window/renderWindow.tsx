import type { ChatMessageResponse, Room, Space, UserRole } from "../../../../api";
import { useChatHistory } from "@/components/chat/indexedDB/useChatHistory";
import { SpaceContext } from "@/components/chat/spaceContext";
import AudioPlayer from "@/components/common/AudioPlayer";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { isElectronEnv } from "@/utils/isElectronEnv";
import launchWebGal from "@/utils/launchWebGal";
import { pollPort } from "@/utils/pollPort";
import { UploadUtils } from "@/utils/UploadUtils";
import { ChatRenderer } from "@/webGAL/chatRenderer";
import { use, useEffect, useMemo, useRef, useState } from "react";
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
}
/**
 * 渲染时候所必要的一些信息
 */
export interface RenderInfo {
  space: Space;
  rooms: Room[];
  roles: UserRole[];
  chatHistoryMap: Record<number, ChatMessageResponse[]>; // roomId to chatHistory
  roleAudios: { [roleId: number]: File }; // 角色音频文件映射
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
  const uploadUtils = new UploadUtils();
  const spaceId = use(SpaceContext).spaceId ?? -1;

  const spaceInfo = useGetSpaceInfoQuery(spaceId).data?.data;

  const chatHistory = useChatHistory(null);
  const [chatHistoryMap, setChatHistoryMap] = useState<Record<number, ChatMessageResponse[]>>({});
  const getUserRoomsQuery = useGetUserRoomsQuery(spaceId);
  const rooms = useMemo(() => getUserRoomsQuery.data?.data ?? [], [getUserRoomsQuery.data?.data]);

  useEffect(() => {
    if (!rooms || rooms.length === 0) {
      return;
    }
    const getAllMessages = async () => {
      const map: Record<number, ChatMessageResponse[]> = {};
      for (const room of rooms) {
        map[room.roomId!] = await chatHistory.getMessagesByRoomId(room.roomId!);
      }
      setChatHistoryMap(map);
    };
    getAllMessages();
  }, [rooms]);
  const roleIds = useMemo(() => {
    const roleIds = new Set<number>();
    Object.values(chatHistoryMap)
      .flat()
      .filter(m => m.message.status !== 1)
      .map(m => m.message.roleId)
      .forEach(roleId => roleIds.add(roleId));
    return Array.from(roleIds);
  }, [chatHistoryMap]);

  // const roles = useGetRoomRolesQueries(rooms.map(r => r.roomId!))
  //   .map(q => q.data?.data ?? [])
  //   .flat();
  const getRolesQueries = useGetRolesQueries(roleIds);
  const roles = getRolesQueries
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
  });
  const [excludedRoomIds, setExcludedRoomIds] = useState<Set<number>>(new Set());
  const [roleAudios, setRoleAudios] = useState<{ [roleId: number]: File }>({});
  const [isRendering, setIsRendering] = useState(false);
  const [renderProcess, setRenderProcess] = useState<RenderProcess>({});
  const fileInputRefs = useRef<{ [roleId: number]: HTMLInputElement | null }>({});

  // 从localStorage初始化数据
  useEffect(() => {
    const savedProps = localStorage.getItem("renderProps");
    if (savedProps) {
      updateRenderProps(JSON.parse(savedProps));
    }

    const savedExcludedRooms = localStorage.getItem("excludedRoomIds");
    if (savedExcludedRooms) {
      setExcludedRoomIds(new Set(JSON.parse(savedExcludedRooms)));
    }
  }, [updateRenderProps]);

  async function handleRender() {
    // 保存数据到localStorage
    localStorage.setItem("renderProps", JSON.stringify(renderProps));
    localStorage.setItem("excludedRoomIds", JSON.stringify(Array.from(excludedRoomIds)));

    setIsRendering(true);
    // 轮询检测TTS服务是否启动
    if (renderProps.useVocal) {
      await pollPort(
        Number(
          (import.meta.env.VITE_TTS_URL as string).split(":").pop(),
        ),
        500,
        100,
      ).catch(() => { toast.error("TTS 服务器未启动,未进行语音合成"); });
    }

    setRenderProcess({});
    launchWebGal();
    // 轮询检测WebGAL服务是否启动
    await pollPort(
      Number(
        (import.meta.env.VITE_TERRE_URL as string).split(":").pop(),
      ),
      isElectronEnv() ? 15000 : 500,
      100,
    ).catch(() => toast.error("WebGAL 启动失败"));

    // 过滤掉被排除的房间
    const filteredRooms = rooms.filter(room => !excludedRoomIds.has(room.roomId!));

    const renderInfo: RenderInfo = {
      space: spaceInfo!,
      rooms: filteredRooms,
      roles,
      chatHistoryMap,
      roleAudios,
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

  if (getRolesQueries.some(q => q.isLoading)) {
    return (
      <div className="flex justify-center items-center h-30">
        <div className="items-center">加载中...</div>
        <span className="loading loading-spinner loading-xl"></span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-base-content">渲染设置</h2>

      <div className="divider">消息过滤规则 (正则表达式)</div>
      {/* 跳过语句的正则表达式输入 */}
      <div className="form-control space-y-2">
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
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-84">
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
      <div className="divider">排除房间</div>
      {/* 房间排除选择 */}
      <div className="form-control space-y-2">
        <div className="text-xs text-base-content/50 mb-2">
          选择不参与渲染的房间。被排除的房间内容将不会出现在最终的渲染结果中。
        </div>
        <div className="space-y-2 max-h-35 overflow-y-auto">
          {rooms.map(room => (
            <div key={room.roomId} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={excludedRoomIds.has(room.roomId!)}
                onChange={(e) => {
                  const newExcludedRooms = new Set(excludedRoomIds);
                  if (e.target.checked) {
                    newExcludedRooms.add(room.roomId!);
                  }
                  else {
                    newExcludedRooms.delete(room.roomId!);
                  }
                  setExcludedRoomIds(newExcludedRooms);
                }}
              />
              <span className="text-sm text-base-content truncate flex-1">
                {room.name}
              </span>
              <span className="text-xs text-base-content/50">
                {chatHistoryMap[room.roomId!]?.length || 0}
                {" "}
                条消息
              </span>
            </div>
          ))}
          {rooms.length === 0 && (
            <div className="text-center text-base-content/50 py-2">
              暂无房间数据
            </div>
          )}
        </div>
        {excludedRoomIds.size > 0 && (
          <div className="text-xs text-warning">
            已排除
            {" "}
            {excludedRoomIds.size}
            {" "}
            个房间
          </div>
        )}
      </div>
      <div className="divider">语音合成</div>
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
              用于语音合成的音色参考。未上传参考音频的角色对话将无法进行语音合成。
            </div>
            <div className="space-y-3 max-h-90 overflow-y-auto">
              {sortedRoles.map((role) => {
                const hasVoiceUrl = role.voiceUrl && role.voiceUrl.trim() !== "";
                const hasUploadedAudio = roleAudios?.[role.roleId];

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
                        <RoleAvatarComponent
                          avatarId={role.avatarId!}
                          width={8}
                          isRounded={true}
                          stopPopWindow
                        >
                        </RoleAvatarComponent>
                        <span
                          className="font-medium text-base-content max-w-[35%] truncate"
                        >
                          {role.roleName || "未知角色"}
                        </span>
                        {
                          hasUploadedAudio
                            ? (
                                <div className="badge badge-info badge-sm inline">
                                  {hasVoiceUrl ? "已覆盖默认音频" : "已上传"}
                                </div>
                              )
                            : (
                                <div
                                  className={`badge ${hasVoiceUrl ? "badge-success" : "badge-warning"} badge-sm inline`}
                                >
                                  {hasVoiceUrl ? "有默认音频" : "缺少音频"}
                                </div>
                              )
                        }
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="file"
                        accept="audio/*"
                        // placeholder={hasVoiceUrl ? "有默认音频，点击覆盖" : "未上传音频"}
                        className="file-input file-input-bordered file-input-sm flex-1"
                        ref={(el) => {
                          fileInputRefs.current[role.roleId] = el;
                        }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const hash = await uploadUtils.calculateFileHash(file);
                            const newFile = new File([file], `${hash}.${file.name.split(".").pop()}`, { type: file.type });
                            setRoleAudios((prev) => {
                              prev[role.roleId] = newFile;
                              return prev;
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
                            setRoleAudios((prev) => {
                              delete prev[role.roleId];
                              return prev;
                            });
                            // 重置文件输入框的值
                            const fileInput = fileInputRefs.current[role.roleId];
                            if (fileInput) {
                              fileInput.value = "";
                            }
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
                        警告: 此角色没有默认参考音频，建议上传一个音频文件。
                      </div>
                    )}
                    {
                      hasVoiceUrl && !hasUploadedAudio && (
                        <div className="text-xs text-base-content/70 py-1">
                          可以由上方覆盖默认音频
                        </div>
                      )
                    }
                    {
                      (() => {
                        if (hasUploadedAudio) {
                          return (
                            <AudioPlayer
                              audioFile={roleAudios[role.roleId!]}
                              size="sm"
                              height={20}
                            >
                            </AudioPlayer>
                          );
                        }
                        else if (hasVoiceUrl) {
                          return <AudioPlayer audioUrl={role.voiceUrl} size="sm" height={20} />;
                        }
                      })()
                    }
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
