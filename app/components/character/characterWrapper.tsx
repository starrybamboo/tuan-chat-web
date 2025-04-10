/* eslint-disable react-dom/no-missing-button-type */
import { useMutation, useQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useCharacterInitialization, useRoleQuery, useUserQuery } from "api/queryHooks";
import CharacterNav from "app/components/character/characterNav";
import CreatCharacter from "app/components/character/creatCharacter";
import PreviewCharacter from "app/components/character/previewCharacter";
import { PopWindow } from "app/components/common/popWindow";
import { useState } from "react";
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
  currentIndex: number;
}

export default function CharacterWrapper() {
  // 调用API部分
  // 获取用户数据
  const userQuery = useUserQuery();
  const roleQuery = useRoleQuery(userQuery);

  // 动态页面的规划
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);

  // 传入popWindow,处理删除的弹窗
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteCharacterId, setDeleteCharacterId] = useState<number | null>(null);

  // 切换角色后的保存
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  // 使用自定义 Hook 初始化角色数据
  const { characters, initializeCharacters, updateCharacters } = useCharacterInitialization(roleQuery);

  // 初始化用户角色信息,这里可以直接使用useQuery初始化
  useQuery({
    queryKey: ["initializeCharacters"],
    queryFn: async () => {
      initializeCharacters();
    },
  });

  const { mutate: deleteRole } = useMutation({
    mutationKey: ["deleteRole"],
    mutationFn: async (roleId: number[]) => {
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
    updateCharacters([...characters, newCharacter]);
    setCreating(false);
    setSelectedCharacter(newCharacter.id);
  };

  // 编辑角色
  const handleUpdate = (updatedCharacter: CharacterData) => {
    updateCharacters(characters.map(c =>
      c.id === updatedCharacter.id ? updatedCharacter : c,
    ));
    setEditingCharacterId(null);
    setSelectedCharacter(updatedCharacter.id);
  };
  // 删除角色
  const handleDelete = (id: number) => {
    setDeleteConfirmOpen(true);
    setDeleteCharacterId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteCharacterId !== null) {
      const roleId = deleteCharacterId;
      if (roleId) {
        deleteRole([roleId]);
        updateCharacters(characters.filter(c => c.id !== deleteCharacterId));
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

  // 保存角色的方法
  const handleSaveCharacter = () => {
    // 调用 handleSumbit 更新角色
    const characterToSave = characters.find(c => c.id === editingCharacterId);
    if (characterToSave) {
      handleUpdate(characterToSave);
      // 这里应该使用handleSubmit,但一旦移植到本文件,可能要大改
    }
    // 关闭保存确认弹窗
    setSaveConfirmOpen(false);
  };

  // 取消保存的方法
  const handleCancelSave = () => {
    setSaveConfirmOpen(false);
  };

  const handleCharacterSelect = (id: number) => {
    if (editingCharacterId !== null && editingCharacterId !== id) {
      setSaveConfirmOpen(true);
    }
    setSelectedCharacter(id);
  };

  return (
    <div className="h-full w-screen bg-[#E6F2F9]">

      <div className="flex h-full">
        <div className="w-1/4">
          <CharacterNav
            characters={characters}
            onCreate={() => setCreating(true)}
            onSelect={handleCharacterSelect}
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

      {/* 切换选择角色时保存角色 */}
      <PopWindow isOpen={saveConfirmOpen} onClose={handleCancelSave}>
        <div className="p-4">
          <h3 className="text-lg font-bold mb-4">确认保存角色</h3>
          <p className="mb-4">确定要保存当前角色吗？</p>
          <div className="flex justify-end">
            <button className="btn btn-sm btn-outline btn-error mr-2" onClick={handleCancelSave}>
              取消
            </button>
            <button className="btn btn-sm bg-[#3A7CA5] text-white hover:bg-[#2A6F97]" onClick={() => handleSaveCharacter()}>
              确认保存
            </button>
          </div>
        </div>
      </PopWindow>
    </div>
  );
}
