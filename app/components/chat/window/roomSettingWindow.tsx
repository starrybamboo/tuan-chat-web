import { RoomContext } from "@/components/chat/roomContext";
import MemberLists from "@/components/chat/smallComponents/memberLists";
import RoleList from "@/components/chat/smallComponents/roleLists";
import checkBack from "@/components/common/autoContrastText";
import ConfirmModal from "@/components/common/comfirmModel";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { GirlIcon, MemberIcon, Setting, WebgalIcon } from "@/icons";
import launchWebGal from "@/utils/launchWebGal";
import { pollPort } from "@/utils/pollPort";
import { ChatRenderer } from "@/webGAL/chatRenderer";
import {
  useDissolveRoomMutation,
  useGetRoomInfoQuery,
  useGetRoomRoleQuery,
  useUpdateRoomMutation,
} from "api/hooks/chatQueryHooks";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router";
import { useImmer } from "use-immer";
import { SpaceContext } from "../spaceContext";

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

function RoomSettingWindow({ onClose, onShowMembers: _onShowMembers, onRenderDialog: _onRenderDialog, roomId: propRoomId }: {
  onClose: () => void;
  onShowMembers: () => void;
  onRenderDialog: () => void;
  roomId?: number;
}) {
  const navigate = useNavigate();
  // 尝试获取context，如果不存在则为null
  let roomContext = null;
  let spaceContext = null;
  try {
    roomContext = use(RoomContext);
    spaceContext = use(SpaceContext);
  }
  catch (e) {
    console.warn(e);
    // context不存在，使用默认值
  }
  const setActiveRoomId = spaceContext?.setActiveRoomId;
  // 获取群组数据 - 优先使用props传入的roomId，否则使用context
  const roomId = propRoomId ?? Number(roomContext?.roomId);
  const getRoomInfoQuery = useGetRoomInfoQuery(roomId ?? -1);
  const room = getRoomInfoQuery.data?.data;

  // 获取房间成员和角色
  const roomMembers = roomContext?.roomMembers ?? [];
  const roomRolesQuery = useGetRoomRoleQuery(roomId ?? -1);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);
  // 解散群组
  const dissolveRoomMutation = useDissolveRoomMutation();
  const updateRoomMutation = useUpdateRoomMutation();

  // 使用状态管理表单数据
  const [formData, setFormData] = useState({
    name: room?.name || "",
    description: room?.description || "",
    avatar: room?.avatar || "",
  });

  // 用于强制重置上传组件
  const [uploaderKey, setUploaderKey] = useState(0);

  const handleAvatarUpdate = (url: string) => {
    setFormData(prev => ({ ...prev, avatar: url }));
    // 上传完成后强制重置上传组件
    setUploaderKey(prev => prev + 1);
  };

  // 控制删除群组的确认弹窗显示
  const [isDissolveConfirmOpen, setIsDissolveConfirmOpen] = useState(false);

  // 头像文字颜色
  const [avatarTextColor, setAvatarTextColor] = useState("text-black");

  // 渲染对话相关状态
  const spaceId = spaceContext?.spaceId ?? -1;
  const [renderProps, updateRenderProps] = useImmer<RenderProps>({
    spritePosition: "left",
    useVocal: false,
    skipRegex: "", // 初始化 skipRegex
  });
  const [isRendering, setIsRendering] = useState(false);
  const [renderProcess, setRenderProcess] = useState<RenderProcess>({});

  // 音频文件引用
  const audioFileRef = useRef<HTMLInputElement>(null);

  // 监听头像变化，自动调整文字颜色
  useEffect(() => {
    if (formData.avatar) {
      checkBack(formData.avatar).then(() => {
        const computedColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--text-color")
          .trim();
        setAvatarTextColor(computedColor === "white" ? "text-white" : "text-black");
      });
    }
  }, [formData.avatar]);

  // 从localStorage初始化渲染数据
  useEffect(() => {
    const savedProps = localStorage.getItem("renderProps");
    if (savedProps) {
      updateRenderProps(JSON.parse(savedProps));
    }
  }, [updateRenderProps]);

  // 当room数据加载时初始化formData
  if (room && formData.name === "" && formData.description === "" && formData.avatar === "") {
    setFormData({
      name: room.name || "",
      description: room.description || "",
      avatar: room.avatar || "",
    });
  }

  // 保存数据函数
  const handleSave = () => {
    updateRoomMutation.mutate({
      roomId,
      name: formData.name,
      description: formData.description,
      avatar: formData.avatar,
    }, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  // 退出时自动保存
  const handleClose = () => {
    handleSave();
  };

  // 处理渲染对话
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
    <div className="flex flex-row gap-4 h-full w-full max-w-3xl">
      {room && (
        <div className="tabs tabs-lift h-full">
          {/* 成员管理 */}
          <label className="tab">
            <input
              type="radio"
              name="room_setting_tabs"
              defaultChecked
            />
            <MemberIcon className="size-4" />
            成员
          </label>
          <div className="tab-content space-y-2 p-4 overflow-y-auto">
            <div className="flex flex-row justify-center items-center gap-2 px-4">
              <p>
                房间成员 -
                {roomMembers.length}
              </p>
            </div>
            <MemberLists members={roomMembers} />
          </div>

          {/* 角色管理 */}
          <label className="tab">
            <input
              type="radio"
              name="room_setting_tabs"
            />
            <GirlIcon className="size-4" />
            角色
          </label>
          <div className="tab-content space-y-2 p-4 overflow-y-auto">
            <div className="flex flex-row justify-center items-center gap-2 px-4">
              <p>
                房间角色 -
                {roomRoles.length}
              </p>
            </div>
            <RoleList roles={roomRoles} />
          </div>

          {/* 基本设置 */}
          <label className="tab">
            <input type="radio" name="room_setting_tabs" />
            <Setting className="size-4" />
            设置
          </label>
          <div className="tab-content p-4 overflow-y-auto">
            <div className="w-full max-w-md mx-auto">
              {/* 头像上传 */}
              <div className="flex justify-center mb-6">
                <ImgUploaderWithCopper
                  key={uploaderKey}
                  setCopperedDownloadUrl={handleAvatarUpdate}
                  fileName={`roomId-${room.roomId}`}
                >
                  <div className="relative group overflow-hidden rounded-lg">
                    <img
                      src={formData.avatar || room.avatar}
                      alt={formData.name}
                      className="w-24 h-24 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm">
                      <span className={`${avatarTextColor} font-bold px-2 py-1 rounded`}>
                        更新头像
                      </span>
                    </div>
                  </div>
                </ImgUploaderWithCopper>
              </div>

              {/* 房间名称 */}
              <div className="mb-4">
                <label className="label mb-2">
                  <span className="label-text">房间名称</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  className="input input-bordered w-full"
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                  }}
                  placeholder="请输入房间名称..."
                />
              </div>

              {/* 房间描述 */}
              <div className="mb-4">
                <label className="label mb-2">
                  <span className="label-text">房间描述</span>
                </label>
                <textarea
                  value={formData.description}
                  className="textarea w-full min-h-[100px]"
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                  }}
                  rows={4}
                  placeholder="请输入房间描述..."
                />
              </div>
            </div>

            {/* 保存和删除按钮 */}
            <div className="flex justify-between mt-16">
              <button
                type="button"
                className="btn btn-error"
                onClick={() => setIsDissolveConfirmOpen(true)}
              >
                解散房间
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleClose}
              >
                保存并关闭
              </button>
            </div>
          </div>

          {/* 渲染对话 */}
          <label className="tab">
            <input
              type="radio"
              name="room_setting_tabs"
            />
            <WebgalIcon className="size-4 mr-1" />
            渲染
          </label>
          <div className="tab-content p-4 overflow-y-auto">
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
          </div>
        </div>
      )}

      {/* 渲染删除群组的确认弹窗 */}
      <ConfirmModal
        isOpen={isDissolveConfirmOpen}
        onClose={() => setIsDissolveConfirmOpen(false)}
        title="确认解散房间"
        message="是否确定要解散该房间？此操作不可逆。"
        onConfirm={() => {
          dissolveRoomMutation.mutate(roomId, {
            onSuccess: () => {
              onClose();
              if (roomContext?.spaceId) {
                navigate(`/chat/${roomContext.spaceId}`, { replace: true });
              }
              setIsDissolveConfirmOpen(false);
              setActiveRoomId?.(null);
            },
          });
        }}
      />
    </div>
  );
}

export default RoomSettingWindow;
