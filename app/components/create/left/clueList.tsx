import type { StageEntityResponse } from "api";
import { useAddMutation } from "api/hooks/moduleAndStageQueryHooks";
import { useDeleteEntityMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import { useState } from "react";
import { useModuleContext } from "../workPlace/context/_moduleContext";
import { ModuleItemEnum } from "../workPlace/context/types";

// 线索表单项（完全复刻 SceneListItem，仅文件上下文不同）
function ClueListItem(
  { name, isSelected, onClick, onDelete, deleteMode }: {
    name: string;
    isSelected: boolean;
    onClick?: () => void;
    onDelete?: () => void;
    deleteMode?: boolean;
  },
) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div
      className={`group relative w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""}`}
      onClick={onClick}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex flex-col min-w-0 truncate">
          <p className="text-sm font-medium">{name}</p>
        </div>
      </div>

      {/* 右侧按钮（删除/确认） */}
      <div className="flex items-center gap-1">
        {onDelete && deleteMode && (
          <button
            type="button"
            className="btn btn-ghost btn-xs opacity-100 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            aria-label="立即删除剧情"
            title="删除"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        {onDelete && !deleteMode && confirming && (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(false);
              }}
              aria-label="取消删除"
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-error btn-xs text-error-content"
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(false);
                onDelete?.();
              }}
              aria-label="确认删除剧情"
            >
              删除
            </button>
          </>
        )}
        {onDelete && !deleteMode && !confirming && (
          <button
            type="button"
            className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
            onClick={(e) => {
              e.stopPropagation();
              setConfirming(true);
            }}
            aria-label="删除剧情"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default function ClueList({ stageId, searchQuery: controlledQuery, deleteMode }: { stageId: number; searchQuery?: string; deleteMode?: boolean; showCreateButton?: boolean }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem } = useModuleContext();
  const handleClick = (clue: StageEntityResponse) => {
    pushModuleTabItem({
      id: clue.id!.toString(),
      label: clue.name!,
      content: clue,
      type: ModuleItemEnum.CLUE,
    });
    setCurrentSelectedTabId(clue.id!.toString());
  };

  // 模组相关
  const { data, isSuccess: _isSuccess } = useQueryEntitiesQuery(stageId);
  const list = data?.data!.filter(i => i.entityType === 6);

  // 添加搜索状态
  const [searchQuery, setSearchQuery] = useState("");
  const effectiveQuery = (controlledQuery ?? searchQuery).toLowerCase();

  // 根据搜索查询过滤列表，并按 id 升序稳定排序
  const filteredList = list?.filter(i => ((i.name) || "").toLowerCase().includes(effectiveQuery));
  const sum = list?.length ?? 0;
  const sortedList = filteredList?.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

  const isEmpty = !sortedList || sortedList!.length === 0;

  // 删除线索
  const { mutate: deleteClue } = useDeleteEntityMutation();
  // 新建线索（entityType=6），使用本地 mutation 以支持类型 6
  const { mutate: addClue } = useAddMutation();

  const getUniqueName = (base: string, existing: Array<{ name?: string | null }>) => {
    let idx = 1;
    let name = `${base}${idx}`;
    const hasName = (n: string) => existing.some(e => e.name === n);
    while (hasName(name)) {
      idx++;
      name = `${base}${idx}`;
    }
    return name;
  };

  const handleCreate = () => {
    const name = getUniqueName("新线索夹", list || []);
    addClue({
      stageId,
      name,
      entityType: 6,
      entityInfo: {
        roles: [],
        items: [],
        locations: [],
      },
    });
  };

  return (
    <>
      {controlledQuery === undefined && (
        <div className="px-2 pb-2">
          <label className="input input-bordered flex items-center gap-2">
            <svg className="h-4 w-4 opacity-70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              className="grow"
              placeholder="搜索线索夹..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </label>
        </div>
      )}

      {/* 新建按钮 */}
      <div className="px-4 py-2 border-b border-base-300 flex items-center justify-between gap-2">
        <h3>
          <span>线索夹</span>
          <span> 列表 </span>
          <span>(</span>
          <span>{ sum }</span>
          <span>)</span>
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate} aria-label="新建线索板">
            新建
          </button>
        </div>
      </div>

      {isEmpty
        ? (
            <div className="text-sm text-gray-500 px-2 py-4">
              暂时没有线索夹哦
            </div>
          )
        : (
            sortedList?.map(i => (
              <ClueListItem
                key={i!.id!.toString()}
                name={i!.name || "未命名"}
                deleteMode={deleteMode}
                onDelete={() => {
                  removeModuleTabItem(i.id!.toString());
                  deleteClue({
                    id: i.id!,
                    stageId,
                  });
                }}
                isSelected={currentSelectedTabId === i!.id!.toString()}
                onClick={() => handleClick(i!)}
              />
            ))
          )}
    </>
  );
}
