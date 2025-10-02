import type { UserRole } from "api";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import {
  useGetInfiniteUserRolesQuery,
} from "api/queryHooks";
import { useCallback, useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";

// 角色类型定义
interface Role {
  id: number;
  name: string;
  description: string;
  avatar: string;
  avatarId: number;
  modelName: string;
  speakerName: string;
}

// 角色列表项组件
function RoleListItem({
  role,
  isSelected,
  onSelect,
}: {
  role: Role;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`group w-full p-3 flex items-center gap-3 hover:bg-base-200 cursor-pointer transition-colors ${
        isSelected ? "bg-primary/10 border-l-4 border-primary" : ""
      }`}
      onClick={onSelect}
    >
      <div className="avatar">
        <div className="w-12 h-12 rounded-full">
          <img
            src={role.avatar || "/favicon.ico"}
            alt={role.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-base-content truncate">
          {role.name || "未命名角色"}
        </div>
        <div className="text-sm text-base-content/70 line-clamp-2">
          {role.description || "暂无描述"}
        </div>
      </div>
      {isSelected && (
        <div className="text-primary">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}

interface CreateRoleProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedRoles: Role[]) => void;
  onCreateNew: (num: number) => void;
  multiSelect?: boolean; // 是否支持多选
  existIdSet: Set<string>; // 已存在角色 ID 集合
}

export default function CreateRole({
  isOpen,
  onClose,
  onConfirm,
  onCreateNew,
  multiSelect = false,
}: CreateRoleProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 第二个弹窗
  const [isOpenSecond, setIsOpenSecond] = useState(false);
  const [num, setNum] = useState(1);

  const queryClient = useQueryClient();
  const userId = useGlobalContext().userId;

  // API hooks
  const {
    data: roleQuery,
    isSuccess,
    fetchNextPage,
    hasNextPage,
  } = useGetInfiniteUserRolesQuery(userId ?? -1);

  // 转换角色数据格式
  const convertRole = (role: UserRole): Role => ({
    id: role.roleId || 0,
    name: role.roleName || "",
    description: role.description || "角色描述",
    avatar: "",
    avatarId: role.avatarId || 0,
    modelName: role.modelName || "",
    speakerName: role.speakerName || "",
  });

  // 加载角色数据
  const loadRoles = useCallback(async () => {
    if (isSuccess && roleQuery.pages.length > 0) {
      // 将API返回的角色数据映射为前端使用的格式
      const mappedRoles = roleQuery?.pages.flatMap(page =>
        (page.data?.list ?? []).map(convertRole),
      ) ?? [];

      // 将映射后的角色数据设置到状态中
      setRoles((prev) => {
        // 过滤掉重复的角色
        const existingIds = new Set(prev.map(r => r.id));
        const newRoles = mappedRoles.filter(
          role => !existingIds.has(role.id),
        );
        return [...prev, ...newRoles];
      });

      // 并行加载所有角色的头像
      const avatarPromises = mappedRoles.map(async (role) => {
        // 检查角色的头像是否已经缓存
        const cachedAvatar = queryClient.getQueryData<string>(["roleAvatar", role.id]);
        if (cachedAvatar) {
          return { id: role.id, avatar: cachedAvatar };
        }

        try {
          const res = await tuanchat.avatarController.getRoleAvatar(role.avatarId);
          if (res.success && res.data) {
            const avatarUrl = res.data.avatarUrl;
            // 将头像URL缓存到React Query缓存中
            queryClient.setQueryData(["roleAvatar", role.id], avatarUrl);
            return { id: role.id, avatar: avatarUrl };
          }
          console.warn(`角色 ${role.id} 的头像数据无效或为空`);
          return null;
        }
        catch (error) {
          console.error(`加载角色 ${role.id} 的头像时出错`, error);
          return null;
        }
      });

      // 等待所有头像加载完成并一次性更新状态
      const avatarResults = await Promise.all(avatarPromises);
      const validAvatars = avatarResults.filter(result => result !== null);

      if (validAvatars.length > 0) {
        setRoles((prevChars) => {
          return prevChars.map((char) => {
            const avatarData = validAvatars.find(avatar => avatar?.id === char.id);
            return avatarData ? { ...char, avatar: avatarData.avatar || "" } : char;
          });
        });
      }
    }
  }, [isSuccess, roleQuery, queryClient]); // 加载更多角色
  const loadMoreRoles = useCallback(async () => {
    if (isLoadingMore || !hasNextPage)
      return;

    setIsLoadingMore(true);
    await fetchNextPage();
    setIsLoadingMore(false);
  }, [fetchNextPage, hasNextPage, isLoadingMore]);

  // 初始化角色数据
  useEffect(() => {
    if (isSuccess) {
      loadRoles();
    }
  }, [isSuccess, loadRoles]);

  // 重置状态的函数
  const resetState = useCallback(() => {
    setSelectedRoles(new Set());
    setSearchQuery("");
  }, []);

  // 处理弹窗关闭
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // 过滤角色列表
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
    || role.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 处理角色选择
  const handleRoleSelect = (roleId: number) => {
    if (multiSelect) {
      setSelectedRoles((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(roleId)) {
          newSet.delete(roleId);
        }
        else {
          newSet.add(roleId);
        }
        return newSet;
      });
    }
    else {
      setSelectedRoles(new Set([roleId]));
    }
  };

  // 确认选择
  const handleConfirm = () => {
    const selectedRoleList = roles.filter(role => selectedRoles.has(role.id));

    onConfirm(selectedRoleList);
    handleClose();
  };

  return (
    <PopWindow isOpen={isOpen} onClose={handleClose}>
      <div className="max-w-128 w-128 mx-auto">
        {/* 标题 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-base-content mb-2">
            选择角色
          </h2>
          <p className="text-base-content/70">
            {multiSelect ? "选择一个或多个角色添加到模组中" : "选择一个角色添加到模组中"}
          </p>
        </div>

        {/* 搜索和创建区域 */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="input input-bordered flex items-center gap-2">
              <svg className="h-4 w-4 opacity-70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                className="grow"
                placeholder="搜索角色..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsOpenSecond(true)}
            title="创建新角色"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            创建新角色
          </button>
        </div>

        {/* 角色列表 */}
        <div className="border border-base-300 rounded-lg mb-6" style={{ height: "400px" }}>
          {filteredRoles.length > 0
            ? (
                <Virtuoso
                  style={{ height: "100%" }}
                  data={filteredRoles}
                  endReached={loadMoreRoles}
                  overscan={200}
                  itemContent={(index, role) => (
                    <RoleListItem
                      key={role.id}
                      role={role}
                      isSelected={selectedRoles.has(role.id)}
                      onSelect={() => handleRoleSelect(role.id)}
                    />
                  )}
                  components={{
                    Footer: () => isLoadingMore
                      ? (
                          <div className="flex justify-center items-center py-4">
                            <span className="loading loading-spinner loading-md"></span>
                          </div>
                        )
                      : null,
                  }}
                />
              )
            : (
                <div className="flex items-center justify-center h-full text-base-content/50">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>暂无角色数据</p>
                    <p className="text-sm mt-1">试试创建一个新角色</p>
                  </div>
                </div>
              )}
        </div>

        {/* 选择信息 */}
        {selectedRoles.size > 0 && (
          <div className="alert alert-info mb-4">
            <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              已选择
              {" "}
              {selectedRoles.size}
              {" "}
              个角色
            </span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleClose}
          >
            取消
          </button>
          <button
            type="button"
            className={`btn btn-primary ${selectedRoles.size === 0 ? "btn-disabled" : ""}`}
            onClick={handleConfirm}
            disabled={selectedRoles.size === 0}
          >
            确认选择
            {" "}
            {selectedRoles.size > 0 && `(${selectedRoles.size})`}
          </button>
        </div>
      </div>
      <PopWindow isOpen={isOpenSecond} onClose={() => setIsOpenSecond(false)}>
        <div className="space-y-4">
          <div className="text-xl font-bold">您想要创建几个角色</div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">角色数量：</label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={num}
              onChange={e => setNum(e.target.value as unknown as number)}
              placeholder="请输入提交数量"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onCreateNew(num);
                setIsOpenSecond(false);
              }}
            >
              确认提交
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsOpenSecond(false)}
            >
              取消
            </button>
          </div>
        </div>
      </PopWindow>
    </PopWindow>
  );
};
