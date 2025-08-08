import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatar from "@/components/common/roleAvatar";
import { useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import { useCallback, useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";

interface AddEntityToSceneProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedEntities: StageEntityResponse[]) => void;
  stageId: number;
  entityType: "item" | "role" | "location";
  existIdSet: StageEntityResponse[]; // 已存在实体集合
}

// 实体列表项组件
function EntityListItem({
  entity,
  isSelected,
  onSelect,
  entityType,
}: {
  entity: StageEntityResponse;
  isSelected: boolean;
  onSelect: () => void;
  entityType: "item" | "role" | "location";
}) {
  const entityInfo = entity.entityInfo || {};

  return (
    <div
      className={`group w-full p-3 flex items-center gap-3 hover:bg-base-200 cursor-pointer transition-colors ${
        isSelected ? "bg-primary/10 border-l-4 border-primary" : ""
      }`}
      onClick={onSelect}
    >
      <div className="avatar">
        <div className="w-12 h-12 rounded-full">
          {entityType === "role" && entityInfo.avatarId
            ? (
                <RoleAvatar
                  avatarId={entityInfo.avatarId}
                  width={12}
                  isRounded={true}
                  stopPopWindow={true}
                />
              )
            : (
                <img
                  src={entityInfo.image || entityInfo.avatar || "/favicon.ico"}
                  alt={entity.name}
                  className="w-full h-full object-cover"
                />
              )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-base-content truncate">
          {entity.name || "未命名实体"}
        </div>
        <div className="text-sm text-base-content/70 line-clamp-2">
          {entityInfo.description || "暂无描述"}
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

export default function AddEntityToScene({
  isOpen,
  onClose,
  onConfirm,
  stageId,
  entityType,
  existIdSet,
}: AddEntityToSceneProps) {
  const [entities, setEntities] = useState<StageEntityResponse[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // API hooks
  const { data: entitiesQuery, isSuccess } = useQueryEntitiesQuery(stageId);

  // 加载实体数据
  const loadEntities = useCallback(() => {
    if (isSuccess && entitiesQuery?.data) {
      // 筛选出对应类型的实体
      const filteredEntities = entitiesQuery.data.filter(
        entity => entity.entityType
          === (entityType === "item" ? 1 : entityType === "role" ? 2 : 4),
      );

      // 过滤掉已存在的实体
      const newEntities = filteredEntities.filter(
        entity => entity.id !== undefined && !existIdSet.includes(entity),
      );

      setEntities(newEntities);
    }
  }, [isSuccess, entitiesQuery, entityType, existIdSet]);

  // 初始化实体数据
  useEffect(() => {
    if (isOpen) {
      loadEntities();
      setSelectedEntities(new Set());
      setSearchQuery("");
    }
  }, [isOpen, loadEntities]);

  // 过滤实体列表
  const filteredEntities = entities.filter(entity =>
    (entity.name?.toLowerCase().includes(searchQuery.toLowerCase()) || "")
    || (entity.entityInfo?.description?.toLowerCase().includes(searchQuery.toLowerCase()) || ""),
  );

  // 处理实体选择
  const handleEntitySelect = (entityId: number) => {
    setSelectedEntities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      }
      else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  // 处理弹窗关闭
  const handleClose = useCallback(() => {
    setSelectedEntities(new Set());
    setSearchQuery("");
    onClose();
  }, [onClose]);
  // 确认选择
  const handleConfirm = () => {
    const selectedEntityList = entities.filter(entity =>
      entity.id !== undefined && selectedEntities.has(entity.id),
    );

    onConfirm(selectedEntityList);
    handleClose();
  };

  const entityTypes = {
    item: "物品",
    role: "角色",
    location: "地点",
  };

  return (
    <PopWindow isOpen={isOpen} onClose={handleClose}>
      <div className="max-w-128 w-128 mx-auto">
        {/* 标题 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-base-content mb-2">
            添加
            {entityTypes[entityType]}
          </h2>
          <p className="text-base-content/70">
            选择要添加到场景中的
            {entityTypes[entityType]}
          </p>
        </div>

        {/* 搜索区域 */}
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
                placeholder={`搜索${entityTypes[entityType]}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* 实体列表 */}
        <div className="border border-base-300 rounded-lg mb-6" style={{ height: "400px" }}>
          {filteredEntities.length > 0
            ? (
                <Virtuoso
                  style={{ height: "100%" }}
                  data={filteredEntities}
                  overscan={200}
                  itemContent={(index, entity) => (
                    <EntityListItem
                      key={entity.id}
                      entity={entity}
                      isSelected={entity.id !== undefined && selectedEntities.has(entity.id)}
                      onSelect={() => entity.id !== undefined && handleEntitySelect(entity.id)}
                      entityType={entityType}
                    />
                  )}
                />
              )
            : (
                <div className="flex items-center justify-center h-full text-base-content/50">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>
                      暂无
                      {entityTypes[entityType]}
                      数据
                    </p>
                  </div>
                </div>
              )}
        </div>

        {/* 选择信息 */}
        {selectedEntities.size > 0 && (
          <div className="alert alert-info mb-4">
            <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              已选择
              {" "}
              {selectedEntities.size}
              {" "}
              个
              {entityTypes[entityType]}
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
            className={`btn btn-primary ${selectedEntities.size === 0 ? "btn-disabled" : ""}`}
            onClick={handleConfirm}
            disabled={selectedEntities.size === 0}
          >
            确认选择
            {" "}
            {selectedEntities.size > 0 && `(${selectedEntities.size})`}
          </button>
        </div>
      </div>
    </PopWindow>
  );
}
