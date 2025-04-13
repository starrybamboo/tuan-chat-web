import { useGlobalContext } from "@/components/globalContextProvider";
import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useCharacterInitialization, useUserInfo, useUserRoles } from "api/queryHooks";
import CharacterNav from "app/components/character/characterNav";
import CreatCharacter from "app/components/character/creatCharacter";
import PreviewCharacter from "app/components/character/previewCharacter";
import { PopWindow } from "app/components/common/popWindow";
import { useEffect, useState } from "react";
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
  // 获取用户数据
  const userId = useGlobalContext().userId;
  const userQuery = useUserInfo(userId);
  const roleQuery = useUserRoles(userQuery);

  // 动态页面的规划
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);

  // 删除弹窗状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteCharacterId, setDeleteCharacterId] = useState<number | null>(null);

  // 保存修改弹窗状态和加载状态
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [isSaving] = useState(false);
  // const [isSaving, setIsSaving] = useState(false);

  // 状态暂存待切换的ID
  const [pendingSelectedId, setPendingSelectedId] = useState<number | null>(null);

  // 使用自定义 Hook 初始化角色数据
  const { characters, initializeCharacters, updateCharacters } = useCharacterInitialization(roleQuery);

  // 初始化用户角色信息,这里可以直接使用useQuery初始化,但有延迟,还是改回useEffect我们这边就算状态更新也有动态变化
  useEffect(() => {
    initializeCharacters();
  }, [initializeCharacters]);

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
  // // 保存角色的方法，暂时搁置
  // const handleSaveCharacter = async () => {
  //   setIsSaving(true);
  //   try {
  //     if (pendingSubmitFn) {
  //       pendingSubmitFn(); // 等待保存完成
  //     }
  //
  //     if (pendingSelectedId !== null) {
  //       setSelectedCharacter(pendingSelectedId);
  //       setPendingSelectedId(null);
  //     }
  //   }
  //   catch (error) {
  //     console.error("保存失败:", error);
  //   }
  //   finally {
  //     setSelectedCharacter(pendingSelectedId);
  //     setIsSaving(false);
  //     setSaveConfirmOpen(false);
  //     setEditingCharacterId(null);
  //   }
  // };

  // 取消保存的方法
  const handleCancelSave = () => {
    if (pendingSelectedId !== null) {
      setSelectedCharacter(pendingSelectedId);
    }
    setEditingCharacterId(null);
    setSaveConfirmOpen(false);
  };

  // 仅仅是关闭弹窗
  const handCloseConfirmWindow = () => {
    setSaveConfirmOpen(false);
  };

  const handleCharacterSelect = (id: number) => {
    // 如果正在编辑且切换不同角色
    if (editingCharacterId !== null && id !== editingCharacterId) {
      setPendingSelectedId(id); // 暂存目标ID
      setSaveConfirmOpen(true); // 触发保存确认
    }
    else {
      setSelectedCharacter(id); // 直接切换
    }
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

  return (
    <div className="h-full w-full bg-base-100">

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
        <div className="p-4 bg-base-200">
          <h3 className="text-lg font-bold mb-4">确认删除角色</h3>
          <p className="mb-4">确定要删除这个角色吗？</p>
          <div className="flex justify-end">
            <button className="btn btn-sm btn-outline btn-error mr-2" onClick={handleCancelDelete}>
              取消
            </button>
            <button className="btn btn-sm bg-primary text-white hover:bg-primary-focus" onClick={handleConfirmDelete}>
              确认删除
            </button>
          </div>
        </div>
      </PopWindow>

      {/* 切换选择角色时保存角色 */}
      {/* 相信后人的智慧 */}
      <PopWindow
        isOpen={saveConfirmOpen}
        onClose={handCloseConfirmWindow}
      >
        <div className="p-4">
          {/* 也许后面数据多了会卡住，谁知道呢 */}
          <h3 className="text-lg font-bold mb-4">
            {isSaving ? "正在保存..." : "存在未保存的修改"}
          </h3>

          {!isSaving && (
            <>
              <p className="mb-4 text-gray-600">
                当前角色有未保存的修改，切换将丢失更改！
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  className="btn btn-sm btn-outline btn-error"
                  onClick={handleCancelSave}
                >
                  放弃修改
                </button>
                <button
                  className="btn btn-sm bg-primary text-white hover:bg-primary-focus"
                  onClick={handCloseConfirmWindow}
                >
                  继续编辑
                </button>
              </div>
            </>
          )}

          {isSaving && (
            <div className="flex justify-center items-center py-4">
              <span className="loading loading-spinner text-primary"></span>
              <span className="ml-2 text-gray-500">保存中...</span>
            </div>
          )}
        </div>
      </PopWindow>
    </div>
  );
}
