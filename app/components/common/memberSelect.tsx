import MemberInfoComponent from "@/components/common/memberInfo";
import React from "react";

interface MemberSelectProps {
  /** 可选的成员列表 */
  members: Array<{
    userId?: number;
    [key: string]: any;
  }>;
  /** 已选中的成员ID集合 */
  selectedUserIds: Set<number>;
  /** 选中状态变更回调 */
  onSelectionChange: (newSelectedIds: Set<number>) => void;
  /** 搜索输入值 */
  searchInput: number;
  /** 搜索输入变更回调 */
  onSearchInputChange: (value: number) => void;
  /** 没有成员时的提示信息 */
  emptyMessage?: string;
  /** 搜索框占位文本 */
  searchPlaceholder?: string;
}

export const MemberSelect: React.FC<MemberSelectProps> = ({
  members,
  selectedUserIds,
  onSelectionChange,
  searchInput,
  onSearchInputChange,
  emptyMessage = "没有可选的成员",
  searchPlaceholder = "请输入成员ID",
}) => {
  // 处理成员选择
  const handleMemberSelection = (userId: number, checked: boolean) => {
    const newSet = new Set(selectedUserIds);
    checked ? newSet.add(userId) : newSet.delete(userId);
    onSelectionChange(newSet);
  };

  // 过滤显示的成员
  const matchedMembers = searchInput > 0
    ? members.find(member => member.userId === searchInput)
    : null;
  const displayedMembers = matchedMembers ? [matchedMembers] : members;

  return (
    <div className="flex flex-col gap-y-2">
      {/* 搜索框 */}
      <div>
        <label className="label mb-2">
          <span className="label-text">搜索成员</span>
        </label>
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="input input-bordered w-full mb-2"
          onChange={e => onSearchInputChange(Number(e.target.value))}
        />
      </div>

      {/* 成员列表 */}
      <div className="flex flex-col gap-y-2 pb-4 max-h-[40vh] overflow-y-auto">
        {displayedMembers.length === 0
          ? (
              <div className="text-center py-4 text-gray-500">
                {emptyMessage}
              </div>
            )
          : (
              displayedMembers.map(member => (
                <div
                  key={member.userId}
                  className="flex gap-x-4 items-center p-2 bg-base-100 rounded-lg w-full hover:bg-base-200 transition-colors"
                >
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedUserIds.has(member.userId ?? -1)}
                    onChange={e => handleMemberSelection(member.userId ?? -1, e.target.checked)}
                  />
                  <MemberInfoComponent userId={member.userId ?? -1} />
                </div>
              ))
            )}
      </div>
    </div>
  );
};
