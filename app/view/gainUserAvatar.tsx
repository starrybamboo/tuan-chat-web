/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { RoleAvatar, UserRole } from "api";
import React, { useEffect, useState } from "react";

interface Props {
  initialAvatar?: string;
  onAvatarChange: (avatarUrl: string) => void;
}

// 定义接口实现对象
interface User {
  userRole: UserRole;
  roleAvatars: RoleAvatar[];
  currentAvatarIndex: number;
}

// 默认用户数据
const defaultUser: User = {
  userRole: { userId: 1, roleId: 2 },
  roleAvatars: [{
    avatarUrl: "https://avatars.mds.yandex.net/i?id=2b115573161c976d8338614b2a17baf05f61ab9a-9198173-images-thumbs&n=13",
    avatarTitle: "默认头像",
    avatarId: 0,
    roleId: 1,
  }, {
    roleId: 1,
    avatarUrl: "https://attackofthefanboy.com/wp-content/uploads/2021/09/Ganyu.jpg",
    avatarTitle: "默认头像",
    avatarId: 0,
  }, {
    roleId: 1,
    avatarUrl: "https://cdn1.ozone.ru/s3/multimedia-o/6148805736.jpg",
    avatarTitle: "默认头像",
    avatarId: 0,
  }, {
    roleId: 1,
    avatarUrl: "https://upload-os-bbs.hoyolab.com/upload/2023/01/16/41960289/2961ece383094d26cc247aca2780505b_4307657011580510541.png",
    avatarTitle: "默认头像",
    avatarId: 0,
  }],
  currentAvatarIndex: 0,
};

export default function GainUserAvatar({ initialAvatar, onAvatarChange }: Props) {
  const [user1, setUser] = useState<User>(defaultUser);
  const [previewSrc, setPreviewSrc] = useState(initialAvatar || "");

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
            {user1.userRole.userId || "未设置"}
          </p>
          <p>
            当前头像id:
            {user1.userRole.roleId || "未设置"}
          </p>
          <p>
            可用头像数量:
            {user1.roleAvatars.length}
          </p>
        </div>
        <ul className="w-full mt-5">
          {user1.roleAvatars.length > 0
            ? (
                user1.roleAvatars.map((item, index) => (
                  <li
                    key={item.roleId}
                    className="w-1/3 text-center float-left"
                    onClick={() => handleAvatarClick(item.avatarUrl as string, index)}
                  >
                    <img src={item.avatarUrl} alt="" className="w-4/5 block m-auto" />
                    <p>{item.avatarTitle}</p>
                    <a
                      href="#"
                      className="text-red-300 underline"
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
                <p className="text-center">暂无可用头像</p>
              )}
        </ul>
      </div>
      {/* 大图预览 */}
      <div className="w-4/10 bg-[#686a82ad] h-20 float-left">
        <p className="text-center mt-2 mb-2">精灵图预览</p>
        <img
          src={previewSrc || ""}
          alt=""
          className="block w-full"
          id="correspongdLeftImage"
        />
      </div>
    </div>
  );
}
