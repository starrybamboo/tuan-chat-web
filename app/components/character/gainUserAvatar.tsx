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
  const handleAvatarClick = (avatarUrl: string, index: number) => {
    setPreviewSrc(avatarUrl);
    setUser(prev => ({ ...prev, currentAvatarIndex: index }));
    onAvatarChange(avatarUrl); // 同步到父组件
    // 确保 avatarId 存在且为 number 类型
    const avatarId = user.roleAvatars.length > 0 && user.currentAvatarIndex < user.roleAvatars.length
      ? user.roleAvatars[user.currentAvatarIndex]?.avatarId || 0
      : 0;

    onAvatarIdChange(avatarId); // 安全传递;
  };

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
    <div className="w-full relative mt-5">
      {/* 选择和更新图像 */}
      <div className="w-6/10 float-left">
        <div className="mt-5 ml-2">
          <p>
            当前角色id:
            {user.userRole.roleId || "未设置"}
          </p>
          <p>
            当前头像id:
            {user.roleAvatars.length > 0 && user.currentAvatarIndex < user.roleAvatars.length
              ? user.roleAvatars[user.currentAvatarIndex].avatarId || "未设置"
              : "未设置"}
          </p>
          <p>
            表情差分数量:
            {user.roleAvatars.length}
          </p>
        </div>
        <ul className="w-full mt-5">
          {user.roleAvatars.length > 0
            ? (
                user.roleAvatars.map((item, index) => (
                  <li
                    key={item.roleId}
                    className="w-1/3 text-center float-left overflow-hidden"
                    onClick={() => handleAvatarClick(item.avatarUrl as string, index)}
                  >
                    <img src={item.avatarUrl} alt="" className="w-4/5 block m-auto rounded-lg" />
                    <p className="mt-2">{item.avatarTitle}</p>
                    <a
                      href="#"
                      className="text-red-500 underline"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteAvatar(index);
                      }}
                    >
                      删除
                    </a>
                  </li>
                ))
              )
            : (
                <p className="text-center mt-5">暂无可用头像</p>
              )}
        </ul>
      </div>
      {/* 大图预览 */}
      <div className="w-4/10 bg-base-200 float-left p-2">
        <p className="text-center mt-2 mb-2">大图预览</p>
        <img
          src={previewSrc || ""}
          alt=""
          className="block w-full h-full object-contain"
          id="correspongdLeftImage"
        />
      </div>

      {/* 删除确认弹窗 */}
      <PopWindow isOpen={isDeleteModalOpen} onClose={cancelDeleteAvatar}>
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-bold mb-4">确认删除头像</h3>
          <p className="mb-4">确定要删除该头像吗？</p>
          <div className="flex space-x-4">
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
              确认
            </button>
          </div>
        </div>
      </PopWindow>
    </div>
  );
}
