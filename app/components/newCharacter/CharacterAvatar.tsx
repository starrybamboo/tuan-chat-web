/* eslint-disable react-dom/no-missing-button-type */
import type { RoleAvatar } from "api";
import type { Role } from "./types";
import { useUploadAvatarMutation } from "@/../api/queryHooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useEffect, useState } from "react";
import { PopWindow } from "../common/popWindow";
import { CharacterCopper } from "./CharacterCopper";

export default function CharacterAvatar({ role, onchange }: {
  role: Role;
  onchange: (avatarUrl: string, avatarId: number) => void;
}) {
  const queryClient = useQueryClient();
  // const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [avatarId, setAvatarId] = useState<number>(role.avatarId);
  const [copperedUrl, setCopperedUrl] = useState<string>(role.avatar || "/favicon.ico"); // 修正变量名

  // head组件的迁移
  const [previewSrc, setPreviewSrc] = useState<string | null>("");
  const [roleAvatars, setRoleAvatars] = useState<RoleAvatar[]>([]);
  const [showSprite, setShowSprite] = useState(true);
  // 弹窗的打开和关闭
  const [changeAvatarConfirmOpen, setChangeAvatarConfirmOpen] = useState<boolean>(false);
  // 删除弹窗用
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [avatarToDeleteIndex, setAvatarToDeleteIndex] = useState<number | null>(null);

  // PC端默认显示立绘，移动端显示头像
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)"); // md breakpoint
    setShowSprite(mediaQuery.matches);

    const handleResize = (e: MediaQueryListEvent) => {
      setShowSprite(e.matches);
    };

    mediaQuery.addEventListener("change", handleResize);
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  // 获取角色所有老头像
  useQuery({
    queryKey: ["roleAvatar", role.id],
    queryFn: async () => {
      const res = await tuanchat.avatarController.getRoleAvatars(role.id);
      setRoleAvatars(res.data || []);
      if (res.success && Array.isArray(res.data)) {
        if (role.avatarId !== 0) {
          setCopperedUrl(res.data.find(ele => ele.avatarId === role.avatarId)?.avatarUrl || "/favicon.ico");
          setPreviewSrc(res.data.find(ele => ele.avatarId === role.avatarId)?.spriteUrl || null);
        }
        else {
          setCopperedUrl("/favicon.ico");
          setPreviewSrc("");
        }
      }
      return null;
    },
  });

  // 使用新的 hook
  const { mutate } = useUploadAvatarMutation();

  // 迁移
  // post删除头像请求
  const { mutate: deleteAvatar } = useMutation({
    mutationKey: ["deleteRoleAvatar"],
    mutationFn: async (avatarId: number) => {
      const res = await tuanchat.avatarController.deleteRoleAvatar(avatarId);
      if (res.success) {
        console.warn("删除头像成功");
        queryClient.invalidateQueries({
          queryKey: ["roleAvatar", role.id],
          exact: true, // 确保精确匹配查询键
        });
      }
      else {
        console.error("删除头像失败");
      }
    },
  });

  // 点击头像处理 (新增预览文字更新)
  const handleAvatarClick = (avatarUrl: string, index: number) => {
    const targetAvatar = roleAvatars[index];
    setPreviewSrc(targetAvatar.spriteUrl || avatarUrl);
    setCopperedUrl(roleAvatars[index]?.avatarUrl || "");
    setAvatarId(roleAvatars[index]?.avatarId || 0);
    // 选中的头像移到最前面
    const newRoleAvatars = [...roleAvatars];
    const [selectedAvatar] = newRoleAvatars.splice(index, 1);
    newRoleAvatars.unshift(selectedAvatar);
    setRoleAvatars(newRoleAvatars);
  };

  // 删除操作处理
  const handleDeleteAvatar = (index: number) => {
    setAvatarToDeleteIndex(index);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAvatar = () => {
    if (avatarToDeleteIndex !== null && avatarToDeleteIndex >= 0 && avatarToDeleteIndex < roleAvatars.length) {
      setRoleAvatars(prevRoleAvatars =>
        prevRoleAvatars.filter((_, i) => i !== avatarToDeleteIndex),
      );
      deleteAvatar(roleAvatars[avatarToDeleteIndex]?.avatarId || 0);
      setAvatarToDeleteIndex(null);
      setIsDeleteModalOpen(false);
    }
    else {
      console.error("无效的头像索引");
      setIsDeleteModalOpen(false);
    }
  };

  const cancelDeleteAvatar = () => {
    setAvatarToDeleteIndex(null);
    setIsDeleteModalOpen(false);
  };
  const handleCancelChangeAvatar = () => {
    setChangeAvatarConfirmOpen(false);
  };

  // 辅助函数生成唯一文件名
  const generateUniqueFileName = (roleId: number): string => {
    const timestamp = Date.now();
    return `avatar-${roleId}-${timestamp}`;
  };

  // 生成唯一文件名
  const uniqueFileName = generateUniqueFileName(role.id);

  return (
    <div className="w-full max-w-xs">
      <div className="flex justify-center">
        <div className="avatar cursor-pointer group flex items-center justify-center w-[50%] min-w-[120px] md:w-48" onClick={() => { setChangeAvatarConfirmOpen(true); }}>
          <div className="rounded-xl ring-primary ring-offset-base-100 w-full ring ring-offset-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
            <img
              src={role.avatar || "./favicon.ico"}
              alt="Character Avatar"
              className="object-cover transform group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>

      </div>

      <PopWindow isOpen={changeAvatarConfirmOpen} onClose={handleCancelChangeAvatar}>
        <div className="h-full w-full flex flex-col">
          <div className="flex flex-col md:flex-row gap-4 min-h-0 justify-center">
            {/* 大图预览 */}
            <div className="w-full md:w-1/2 bg-base-200 p-3 rounded-lg order-1 md:order-1">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  角色
                  {showSprite ? "立绘" : "头像"}
                </h2>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowSprite(!showSprite)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  切换
                  {showSprite ? "头像" : "立绘"}
                </button>
              </div>
              <div className="h-[90%] bg-gray-50 rounded border flex items-center justify-center overflow-hidden">
                <img
                  src={showSprite ? (previewSrc || "/favicon.ico") : (copperedUrl || "/favicon.ico")}
                  alt="预览"
                  className="w-full object-contain"
                />
              </div>
            </div>

            <div className="w-full md:w-1/2 p-3 order-2 md:order-2">
              {/* 头像列表区域 */}
              <h2 className="text-xl font-bold mb-4">选择头像：</h2>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
                {roleAvatars.map((item, index) => (
                  <li
                    key={`${role.id}-${item.avatarUrl}`}
                    className="relative w-full max-w-[128px] flex flex-col items-center rounded-lg transition-colors"
                    onClick={() => handleAvatarClick(item.avatarUrl as string, index)}
                  >
                    {/* 头像卡片容器 */}
                    <div className="relative w-full aspect-square group cursor-pointer">
                      <img
                        src={item.avatarUrl}
                        alt="头像"
                        className={`w-full h-full object-contain rounded-lg transition-all duration-300 group-hover:scale-105 ${item.avatarUrl === copperedUrl ? "border-2 border-primary" : "border"}`}
                      />
                      {/* 删除按钮  */}
                      <button
                        className="absolute -top-2 -right-2 w-5 h-5 md:w-7 md:h-7 bg-gray-700 md:bg-gray-500/50 cursor-pointer text-white rounded-full flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:bg-gray-800 z-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAvatar(index);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                          <path
                            fill="currentColor"
                            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                          />
                        </svg>
                      </button>
                      {/* 添加悬浮遮罩 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 rounded-lg"></div>
                    </div>
                    {/* 标题截断优化 */}
                    <p className="text-center w-full truncate max-w-full px-1 text-sm mt-1">
                      {item.avatarTitle}
                    </p>
                  </li>
                ))}
                {/* 添加新头像 */}
                <li className="relative w-full max-w-[128px] aspect-square flex flex-col items-center rounded-lg transition-colors">
                  <CharacterCopper
                    setDownloadUrl={() => { }}
                    setCopperedDownloadUrl={setCopperedUrl}
                    fileName={uniqueFileName}
                    mutate={(data) => {
                      mutate({ ...data, roleId: role.id });
                    }}
                  >
                    <button className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-base-200 transition-all cursor-pointer relative group">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full text-gray-400 transition-transform duration-300 group-hover:scale-105"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </button>
                  </CharacterCopper>
                </li>
              </div>
            </div>

            {/* 删除确认弹窗 */}
            <PopWindow isOpen={isDeleteModalOpen} onClose={cancelDeleteAvatar}>
              <div className="card">
                <div className="card-body items-center text-center">
                  <h2 className="card-title text-2xl font-bold">确认删除头像</h2>
                  <div className="divider"></div>
                  <p className="text-lg opacity-75 mb-8">确定要删除这个头像吗？</p>
                </div>
              </div>
              <div className="card-actions justify-center gap-6 mt-8">
                <button type="button" className="btn btn-outline" onClick={cancelDeleteAvatar}>
                  取消
                </button>
                <button type="button" className="btn btn-error" onClick={confirmDeleteAvatar}>
                  删除
                </button>
              </div>
            </PopWindow>
          </div>
          <div className="card-actions justify-end">
            <button
              type="submit"
              onClick={() => {
                setChangeAvatarConfirmOpen(false);
                onchange(copperedUrl, avatarId);
              }}
              className="btn btn-primary mt-2"
            >
              确认更改头像
            </button>
          </div>
        </div>

      </PopWindow>
    </div>
  );
}
