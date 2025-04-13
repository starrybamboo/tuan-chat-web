import type { RoleAvatar, UserRole } from "api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useState } from "react";
import { PopWindow } from "../common/popWindow";

interface Props {
  initialAvatar?: string;
  roleId: number;
  onAvatarChange: (avatarUrl: string) => void;
  onAvatarIdChange: (avatarId: number) => void;
  userQuery?: any;
  roleQuery?: any;
}

// 定义接口实现对象
interface User {
  userRole: UserRole;
  roleAvatars: RoleAvatar[];
  currentAvatarIndex: number;
}

export default function GainUserAvatar({ initialAvatar, roleId, onAvatarChange, onAvatarIdChange, userQuery }: Props) {
  // 默认用户数据
  const defaultUser: User = {
    userRole: {
      userId: userQuery?.data?.userId || 0,
      roleId,
      roleName: "",
    },
    roleAvatars: [],
    currentAvatarIndex: 0,
  };
  const [user, setUser] = useState<User>(defaultUser);
  const [previewSrc, setPreviewSrc] = useState(initialAvatar || "");
  const [previewText, setPreviewText] = useState(""); // 新增预览文字状态

  // 删除弹窗用
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [avatarToDeleteIndex, setAvatarToDeleteIndex] = useState<number | null>(null);

  // post删除头像请求
  const { mutate } = useMutation({
    mutationKey: ["deleteRoleAvatar"],
    mutationFn: async (avatarId: number) => {
      const res = await tuanchat.avatarController.deleteRoleAvatar(avatarId);
      if (res.success) {
        console.warn("删除头像成功");
      }
      else {
        console.error("删除头像失败");
      }
    },
  });

  useQuery({
    queryKey: ["roleAvatar", roleId],
    queryFn: async () => {
      const res = await tuanchat.avatarController.getRoleAvatars(roleId);
      if (res.success && Array.isArray(res.data)) {
        const roleAvatars = res.data;
        const currentAvatarIndex = res.data?.length > 0 ? 0 : -1;
        setUser((prev) => {
          return {
            ...prev,
            roleAvatars,
            currentAvatarIndex,
          };
        });
        return res.data;
      }
      else {
        console.error("获取角色头像失败");
        return [];
      }
    },
  });

  // 点击头像处理 (新增预览文字更新)
  const handleAvatarClick = (avatarUrl: string, index: number) => {
    const targetAvatar = user.roleAvatars[index];
    setPreviewSrc(targetAvatar.spriteUrl || avatarUrl);
    setPreviewText(targetAvatar.avatarTitle || ""); // 同步更新预览文字
    setUser(prev => ({ ...prev, currentAvatarIndex: index }));

    // 确保 avatarId 存在且为 number 类型
    const avatarId = targetAvatar.avatarId || 0;
    onAvatarChange(avatarUrl); // 同步到父组件
    onAvatarIdChange(avatarId); // 安全传递
  };

  // 删除操作处理
  const handleDeleteAvatar = (index: number) => {
    setAvatarToDeleteIndex(index);
    setIsDeleteModalOpen(true);
  };
  const confirmDeleteAvatar = () => {
    if (avatarToDeleteIndex !== null) {
      setUser(prev => ({
        ...prev,
        roleAvatars: prev.roleAvatars.filter((_, i) => i !== avatarToDeleteIndex),
      }));
      mutate(user.roleAvatars[avatarToDeleteIndex].avatarId || 0);
      setAvatarToDeleteIndex(null);
      setIsDeleteModalOpen(false);
    }
  };

  const cancelDeleteAvatar = () => {
    setAvatarToDeleteIndex(null);
    setIsDeleteModalOpen(false);
  };

  return (
    <div className="w-full relative mt-5 flex gap-4">
      {" "}
      {/* 选择和更新图像 */}
      <div className="flex-1">
        {" "}
        {/* 原 w-6/10 */}
        <div className="mt-5 ml-2 space-y-2">
          <p>
            角色
            {" "}
            ID
            {" "}
            :
            {" "}
            {user.userRole.roleId || "未设置"}
          </p>
          <p>
            头像
            {" "}
            ID
            {" "}
            :
            {" "}
            {
              user.roleAvatars[user.currentAvatarIndex]?.avatarId || "未设置"
            }
          </p>
          <p>
            表情差分数量
            {" "}
            :
            {" "}
            {user.roleAvatars.length}
          </p>
        </div>

        {/* 头像列表区域 */}
        <ul className="w-full mt-5">
          <div className="grid grid-cols-3 gap-4 justify-items-center">
            {user.roleAvatars.map((item, index) => (
              <li
                key={item.roleId}
                className="relative w-32 h-36 flex flex-col items-center rounded-lg transition-colors"
                onClick={() => handleAvatarClick(item.avatarUrl as string, index)}
              >
                {/* 头像卡片容器 */}
                <div className="relative w-full h-full group">
                  <img
                    src={item.avatarUrl}
                    alt="头像"
                    className="w-30 h-30 object-contain rounded-lg border"
                  />
                  {/* 删除按钮  */}
                  <button
                    className="absolute -top-2 -right-2 w-7 h-7 bg-gray-500/50 cursor-pointer text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gray-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAvatar(index);
                    }}
                  >
                    ×
                  </button>
                </div>
                {/* 标题截断优化 */}
                <p className="text-center w-full truncate max-w-full px-1 text-sm mt-1">
                  {item.avatarTitle}
                </p>
              </li>
            ))}
          </div>
        </ul>
      </div>

      {/* 大图预览 */}
      <div className="flex-1 bg-base-200 p-3 rounded-lg h-full flex flex-col">
        <p className="text-center font-medium mb-3">大图预览</p>

        {/* 图片预览容器 */}
        <div className="flex-1 bg-gray-50 rounded border">
          {/* 未来如果支持默认图片的话，别忘了在这也加一个喵 */}
          <img
            src={previewSrc}
            alt="预览"
            className="w-full h-full max-h-[400px] object-contain p-2"
          />
        </div>

        {/* 描述区域 */}
        <div className="pt-6 p-3">
          {previewText
            ? (
                <pre className="whitespace-pre-wrap text-center break-words font-sans text-sm leading-relaxed">
                  {previewText}
                </pre>
              )
            : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  点击左侧头像查看描述
                </div>
              )}
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <PopWindow isOpen={isDeleteModalOpen} onClose={cancelDeleteAvatar}>
        <div className="flex flex-col items-center p-4">
          <h3 className="text-lg font-bold mb-3">确认删除头像？</h3>
          <p className="mb-4 text-gray-600">该操作不可撤销</p>
          {/* 这个操作是独立于保存的，未来应该搞一个暂存，如果用户点保存，就不删除后台数据 */}
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cancelDeleteAvatar}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={confirmDeleteAvatar}
            >
              确认删除
            </button>
          </div>
        </div>
      </PopWindow>
    </div>
  );
}
