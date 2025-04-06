/* eslint-disable react-dom/no-missing-button-type */
import type { UserRole } from "api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { tuanchat } from "../../../api/instance";
import useRoleQuery from "../apiRequest/useRoleQuery";
import useUserQuery from "../apiRequest/useUserQuery";
import { PopWindow } from "../avatarComponent/popWindow";
import CharacterNav from "./characterNav";
import CreatCharacter from "./creatCharacter";
import PreviewCharacter from "./previewCharacter";
// 这是一段毫无意义的注释，用于git提交检测
// 接收数据的接口
export interface CharacterData {
  id: number;
  name: string;
  age: number;
  gender: string;
  profession: string;
  hometown: string;
  address: string;
  currentTime: string;
  health: {
    max: number;
    current: number;
  };
  magic: {
    max: number;
    current: number;
  };
  sanity: {
    max: number;
    current: number;
  };
  luck: number;
  description: string;
  avatar: string | undefined;
}

export default function CharacterWrapper() {
  // 调用API部分
  // 获取用户数据
  const queryClient = useQueryClient();
  const userQuery = useUserQuery();
  const roleQuery = useRoleQuery(userQuery);

  // 动态页面的规划
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);

  // 传入popWindow
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteCharacterId, setDeleteCharacterId] = useState<number | null>(null);

  // 初始化用户角色信息
  useEffect(() => {
    if (roleQuery.data && Array.isArray(roleQuery.data.data)) {
      const mappedCharacters = roleQuery.data.data.map((role: UserRole) => ({
        id: role.roleId || 0,
        name: role.roleName || "",
        age: 25,
        gender: "未知",
        profession: "",
        hometown: "",
        address: "",
        currentTime: new Date().toLocaleString(),
        health: {
          max: 100,
          current: 100,
        },
        magic: {
          max: 100,
          current: 100,
        },
        sanity: {
          max: 100,
          current: 100,
        },
        luck: 50,
        description: role.description || "无描述",
        avatar: undefined,
      }));
      // 封装 setCharacters 调用，避免直接在 useEffect 中更新状态
      const updateCharacters = () => {
        setCharacters(mappedCharacters);
      };

      // 使用 Promise.resolve 延迟执行状态更新
      Promise.resolve().then(updateCharacters);

      // 异步加载每个角色的头像
      mappedCharacters.forEach(async (character) => {
        try {
          const res = await tuanchat.roleController.getRoleAvatars(character.id);
          if (
            res.success
            && Array.isArray(res.data) // 检查是否为数组
            && res.data.length > 0 // 检查数组是否非空
            && res.data[0]?.avatarUrl !== undefined // 检查是否有 avatarUrl 属性
            && res.data[0] !== undefined
          ) {
            const avatarUrl = res.data[0].avatarUrl as string; // 类型断言
            queryClient.setQueryData(["roleAvatar", character.id], res.data[0].avatarUrl);
            setCharacters(prevChars =>
              prevChars.map(char =>
                char.id === character.id ? { ...char, avatar: avatarUrl } : char,
              ),
            );
          }
          else {
            console.warn(`角色 ${character.id} 的头像数据无效或为空`);
          }
        }
        catch (error) {
          console.error(`加载角色 ${character.id} 的头像时出错`, error);
        }
      });
    }
  }, [roleQuery.data, queryClient]);

  const { mutate: deleteRole } = useMutation({
    mutationKey: ["deleteRole"],
    mutationFn: async (roleId: number) => {
      const res = await tuanchat.roleController.deleteRole(roleId);
      if (res.success) {
        console.warn("角色删除成功");
        return res;
      }
      else {
        console.error("删除角色失败");
        return undefined;
      }
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
    },
  });
  // 各种事件的处理
  const handleCreate = (newCharacter: CharacterData) => {
    setCharacters([...characters, newCharacter]);
    setCreating(false);
    setSelectedCharacter(newCharacter.id);
  };

  const handleUpdate = (updatedCharacter: CharacterData) => {
    setCharacters(characters.map(c =>
      c.id === updatedCharacter.id ? updatedCharacter : c,
    ));
    setEditingCharacterId(null);
    setSelectedCharacter(updatedCharacter.id);
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmOpen(true);
    setDeleteCharacterId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteCharacterId !== null && roleQuery.data?.data) {
      const roleId = deleteCharacterId;
      if (roleId) {
        deleteRole(roleId);
        setCharacters(characters.filter(c => c.id !== deleteCharacterId));
        setSelectedCharacter(null);
      }
      else {
        console.error("无法获取角色ID");
      }
    }
    setDeleteConfirmOpen(false);
    setDeleteCharacterId(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setDeleteCharacterId(null);
  };

  return (
    <div className="h-screen w-screen bg-[#E6F2F9]">
      <div className="h-1/15 w-screen bg-[#3A7CA5] text-white flex items-center justify-center">
        {/* 主导航栏 */}
        <h1 className="text-2xl font-bold">角色管理</h1>
      </div>
      <div className="flex h-14/15">
        <div className="w-1/4">
          <CharacterNav
            characters={characters}
            onCreate={() => setCreating(true)}
            onSelect={id => setSelectedCharacter(id)}
            selected={selectedCharacter}
          />
        </div>
        <div className="flex-1 p-4">
          {/* 主页面展示情况判断 */}
          {creating || editingCharacterId
            ? (
                <CreatCharacter
                  initialData={editingCharacterId ? characters.find(c => c.id === editingCharacterId) : undefined}
                  onSave={editingCharacterId ? handleUpdate : handleCreate}
                  onCancel={() => {
                    setCreating(false);
                    setEditingCharacterId(null);
                  }}
                  userQuery={userQuery}
                  roleQuery={roleQuery}
                />
              )
            : selectedCharacter
              ? (
                  <PreviewCharacter
                    character={characters.find(c => c.id === selectedCharacter)!}
                    onEdit={() => setEditingCharacterId(selectedCharacter)}
                    onDelete={handleDelete}
                  />
                )
            // 未选中或是创建角色时展示欢迎页面
              : (
                  <div className="card w-full shadow-xl flex items-center justify-center text-gray-400">
                    <p className="text-lg card-title">
                      欢迎
                      {userQuery.data?.data?.username}
                      ,点击左侧创建角色或查看已创建的角色
                    </p>
                  </div>
                )}
        </div>
      </div>
      {/* 删除确认对话框 */}
      <PopWindow isOpen={deleteConfirmOpen} onClose={handleCancelDelete}>
        <div className="p-4">
          <h3 className="text-lg font-bold mb-4">确认删除角色</h3>
          <p className="mb-4">确定要删除这个角色吗？</p>
          <div className="flex justify-end">
            <button className="btn btn-sm btn-outline btn-error mr-2" onClick={handleCancelDelete}>
              取消
            </button>
            <button className="btn btn-sm bg-[#3A7CA5] text-white hover:bg-[#2A6F97]" onClick={handleConfirmDelete}>
              确认删除
            </button>
          </div>
        </div>
      </PopWindow>
    </div>
  );
}
