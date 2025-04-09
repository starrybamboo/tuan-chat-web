/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { RoleAvatar, UserRole } from "api";
import { useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useEffect, useState } from "react";

interface Props {
  initialAvatar?: string;
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

// 默认用户数据
const defaultUser: User = {
  userRole: {
    userId: 0,
    roleId: 0,
    roleName: "",
  },
  roleAvatars: [],
  currentAvatarIndex: 0,
};

export default function GainUserAvatar({ initialAvatar, onAvatarChange, onAvatarIdChange, userQuery, roleQuery }: Props) {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User>(defaultUser);
  const [previewSrc, setPreviewSrc] = useState(initialAvatar || "");

  // 初始化用户角色信息
  useEffect(() => {
    if (roleQuery.data && Array.isArray(roleQuery.data.data) && userQuery.data && userQuery.data.data) {
      const mappedCharacters = roleQuery.data.data.map((role: UserRole, index: number) => ({
        userRole: {
          userId: userQuery.data.data.UserId || 0,
          roleId: role.roleId || 0,
          roleName: role.roleName || "",
        },
        roleAvatars: roleQuery.data.data.map((role: UserRole) => ({
          roleId: role.roleId || 0,
          avatarUrl: "",
          avatarTitle: role.roleName || "",
          avatarId: role.avatarId || 0,
        })),
        currentAvatarIndex: index,
      }));

      // 封装 setCharacters 调用，避免直接在 useEffect 中更新状态
      const updateCharacter = () => {
        setUser(mappedCharacters[0]); // 默认显示第一个角色
      };

      // 使用 Promise.resolve 延迟执行状态更新
      Promise.resolve().then(updateCharacter);

      // 异步加载每个角色的头像
      mappedCharacters.forEach(async (user: User) => {
        try {
          const res = await tuanchat.avatarController.getRoleAvatars(user.userRole.roleId);
          if (
            res.success
            && Array.isArray(res.data)
            && res.data.length > 0
            && res.data[0]?.avatarUrl !== undefined
          ) {
            const avatarUrl = res.data[0].avatarUrl as string; // 类型断言
            queryClient.setQueryData(["roleAvatar", user.userRole.roleId], avatarUrl);

            // 更新角色头像
            setUser(prev => ({
              ...prev,
              roleAvatars: prev.roleAvatars.map(char =>
                char.roleId === user.userRole.roleId ? { ...char, avatarUrl } : char,
              ),
            }));
          }
          else {
            console.warn(`角色 ${user.userRole.roleId} 的头像数据无效或为空`);
          }
        }
        catch (error) {
          console.error(`加载角色 ${user.userRole.roleId} 的头像时出错`, error);
        }
      });
    }
  }, [roleQuery.data, queryClient, userQuery.data]);

  // 同步外部传入的初始头像
  useEffect(() => {
    if (initialAvatar) {
      setPreviewSrc(initialAvatar);
    }
  }, [initialAvatar]);

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
    // eslint-disable-next-line no-alert
    if (window.confirm("确定要删除该头像吗？")) {
      setUser(prev => ({
        ...prev,
        roleAvatars: prev.roleAvatars.filter((_, i) => i !== index),
      }));
    }
  };

  return (
    <div className="w-full relative mt-5">
      {/* 选择和上传图像 */}
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
                    className="w-1/3 text-center float-left"
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
    </div>
  );
}
