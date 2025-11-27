import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { useQueryClient } from "@tanstack/react-query";
import { useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useModuleContext } from "../context/_moduleContext";
import AddEntityToScene from "./addEntityToScene";
import CreateEntityList from "./createEntityList";
import EntityDetailList from "./EntityDetailList";

interface ClueEditProps {
  clue: StageEntityResponse;
}

interface ClueInfo {
  items?: number[];
  roles?: number[];
  locations?: number[];
  [key: string]: any;
}

function normalizeClueInfo(info: Partial<ClueInfo> | undefined): ClueInfo {
  return {
    ...(info || {}),
    items: Array.isArray(info?.items) ? info!.items! : [],
    roles: Array.isArray(info?.roles) ? info!.roles! : [],
    locations: Array.isArray(info?.locations) ? info!.locations! : [],
  };
}

const types = {
  item: "物品",
  role: "角色",
  location: "地点",
} as const;

function Folder({
  moduleData,
  entityType,
  onClick,
  onDelete,
}: {
  moduleData: StageEntityResponse[];
  entityType: "item" | "location" | "role";
  onClick?: () => void;
  onDelete?: (entity: StageEntityResponse) => void;
}) {
  return (
    <div className="collapse collapse-arrow bg-base-300 mb-2">
      <input type="checkbox" className="peer" defaultChecked />
      <div className="collapse-title peer-checked:bg-base-200 text-lg font-bold flex items-center gap-2">
        <span className="flex items-center h-7">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6 text-accent align-middle"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h3.379c.414 0 .81.17 1.102.474l1.197 1.252c.292.304.688.474 1.102.474H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
          </svg>
        </span>
        <span className="leading-none">{types[entityType]}</span>
        <div className="absolute right-15 top-1/2 transform -translate-y-1/2 z-10">
          <button type="button" className="btn btn-primary btn-md btn-square" onClick={onClick}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="collapse-content bg-base-200">
        {entityType === "role"
          ? <EntityDetailList moduleData={moduleData} onDelete={onDelete} />
          : <CreateEntityList moduleData={moduleData} entityType={entityType} onDelete={onDelete} />}
      </div>
    </div>
  );
}

export default function ClueEdit({ clue }: ClueEditProps) {
  const { stageId, beginSelectionLock, endSelectionLock, updateModuleTabLabel, setIsCommitted } = useModuleContext();
  const queryClient = useQueryClient();

  // 本地状态：懒初始化，确保始终是 number[]
  const entityInfo = useMemo(() => clue.entityInfo || {}, [clue.entityInfo]);
  const [localClue, setLocalClue] = useState<ClueInfo>(() => normalizeClueInfo(entityInfo as ClueInfo));
  const prevClueIdRef = useRef<number | undefined>(clue.id);
  useLayoutEffect(() => {
    if (prevClueIdRef.current === clue.id) {
      return;
    }
    setLocalClue(normalizeClueInfo(clue.entityInfo as ClueInfo));
    prevClueIdRef.current = clue.id;
  }, [clue.id, clue.entityInfo]);

  // 弹窗控制
  const [isOpen, setIsOpen] = useState(false);
  const [editEntityType, setEditEntityType] = useState<"item" | "role" | "location">("role");
  const handleAddEntityOpen = (entityType: "item" | "role" | "location") => {
    setIsOpen(true);
    setEditEntityType(entityType);
  };
  const handleClose = () => setIsOpen(false);

  // 实体数据
  const { data: entities } = useQueryEntitiesQuery(stageId as number);

  // 展示列表用 useMemo 推导，避免 effect 里 setState 产生额外渲染
  const allEntities = useMemo(() => {
    return entities?.data ?? [];
  }, [entities]);
  const locations = useMemo(() => {
    const locIds: number[] = Array.isArray(localClue.locations) ? localClue.locations : [];
    if (!locIds.length) {
      return [] as StageEntityResponse[];
    }
    return allEntities.filter(ent => ent.entityType === 4 && ent.versionId != null && locIds.includes(ent.versionId!));
  }, [allEntities, localClue.locations]);
  const items = useMemo(() => {
    const itemIds: number[] = Array.isArray(localClue.items) ? localClue.items : [];
    if (!itemIds.length) {
      return [] as StageEntityResponse[];
    }
    return allEntities.filter(ent => ent.entityType === 1 && ent.versionId != null && itemIds.includes(ent.versionId!));
  }, [allEntities, localClue.items]);
  const roles = useMemo(() => {
    const roleIds: number[] = Array.isArray(localClue.roles) ? localClue.roles : [];
    if (!roleIds.length) {
      return [] as StageEntityResponse[];
    }
    return allEntities.filter(ent => ent.entityType === 2 && ent.versionId != null && roleIds.includes(ent.versionId!));
  }, [allEntities, localClue.roles]);

  // 更新接口（线索 entityType: 6）
  const { mutate: updateClue } = useUpdateEntityMutation(stageId as number);

  // 名称编辑（与 SceneEdit 对齐）
  const nameInputRef = useRef(clue.name || "");
  const nameRef = useRef(clue.name);
  const oldNameRef = useRef(clue.name);
  const nameDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  useLayoutEffect(() => {
    oldNameRef.current = clue.name;
    if ((clue.name || "") !== nameInputRef.current) {
      nameRef.current = clue.name;
      nameInputRef.current = clue.name || "";
    }
  }, [clue.name]);

  const optimisticUpdateEntityName = (newName: string) => {
    if (!stageId) {
      return;
    }
    queryClient.setQueryData<any>(["queryEntities", stageId], (oldData: any) => {
      if (!oldData) {
        return oldData;
      }
      const cloned = { ...oldData };
      if (Array.isArray(cloned.data)) {
        cloned.data = cloned.data.map((ent: any) => (ent.id === clue.id ? { ...ent, name: newName } : ent));
      }
      return cloned;
    });
  };

  const localClueRef = useRef(localClue);
  useEffect(() => {
    localClueRef.current = localClue;
  }, [localClue]);

  const handleNameChange = (val: string) => {
    beginSelectionLock("editing-clue-name", 10000);
    nameInputRef.current = val;
    updateModuleTabLabel?.(clue.id!.toString(), val || "未命名");
    optimisticUpdateEntityName(val || "未命名");
    nameRef.current = val;
    if (nameDebounceTimer.current) {
      clearTimeout(nameDebounceTimer.current);
    }
    nameDebounceTimer.current = setTimeout(() => {
      updateClue({ id: clue.id!, entityType: 6, entityInfo: localClueRef.current, name: val }, {
        onSuccess: () => {
          setIsCommitted(false);
          oldNameRef.current = val;
          setTimeout(() => endSelectionLock(), 600);
        },
        onError: () => endSelectionLock(),
      });
    }, 600);
  };

  const handleNameInputBlur = () => {
    if (nameDebounceTimer.current) {
      return; // 等待提交回调释放锁
    }
    endSelectionLock();
  };

  const applyAndPersist = (next: { items?: number[]; roles?: number[]; locations?: number[] }) => {
    const payload = {
      id: clue.id!,
      name: clue.name!,
      entityType: 6,
      entityInfo: { ...localClue, ...next },
    } as const;

    // 乐观更新
    setLocalClue(prev => ({ ...prev, ...next }));
    queryClient.setQueryData<any>(["queryEntities", stageId], (oldData: any) => {
      if (!oldData)
        return oldData;
      const cloned = { ...oldData };
      if (Array.isArray(cloned.data)) {
        cloned.data = cloned.data.map((ent: any) => (ent.id === clue.id ? { ...ent, entityInfo: payload.entityInfo } : ent));
      }
      return cloned;
    });

    updateClue(payload, {
      onSuccess: () => {
        toast.success("添加成功");
      },
      onError: () => {
        toast.error("添加失败");
      },
    });
  };

  const handleAddEntity = (selected: StageEntityResponse[]) => {
    if (!selected.length) {
      return;
    }
    beginSelectionLock("adding-entity-to-clue", 2000);
    const entityType = selected[0]?.entityType;
    const newIds = selected.map(ent => ent.versionId!).filter(v => typeof v === "number" && !Number.isNaN(v));

    if (entityType === 1) {
      applyAndPersist({ items: Array.from(new Set([...(localClue.items || []), ...newIds])) });
    }
    if (entityType === 2) {
      applyAndPersist({ roles: Array.from(new Set([...(localClue.roles || []), ...newIds])) });
    }
    if (entityType === 4) {
      applyAndPersist({ locations: Array.from(new Set([...(localClue.locations || []), ...newIds])) });
    }

    setTimeout(() => endSelectionLock(), 800);
  };

  const handleDeleteEntity = (entity: StageEntityResponse) => {
    beginSelectionLock("removing-entity-from-clue", 2000);
    if (entity.entityType === 1) {
      applyAndPersist({ items: (localClue.items || []).filter((id: number) => id !== entity.versionId) });
    }
    if (entity.entityType === 2) {
      applyAndPersist({ roles: (localClue.roles || []).filter((id: number) => id !== entity.versionId) });
    }
    if (entity.entityType === 4) {
      applyAndPersist({ locations: (localClue.locations || []).filter((id: number) => id !== entity.versionId) });
    }
    setTimeout(() => endSelectionLock(), 800);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* 名称编辑区域（与 SceneEdit 风格一致） */}
      <div className="flex items-center gap-4 mb-2">
        <div className="group relative max-w-full flex-1">
          <input
            type="text"
            aria-label="编辑线索板名称"
            value={nameInputRef.current}
            onChange={e => handleNameChange(e.target.value)}
            onFocus={() => beginSelectionLock("editing-clue-name", 1500)}
            onBlur={handleNameInputBlur}
            placeholder="输入线索板名称"
            title="点击编辑线索板名称"
            className="font-semibold text-2xl md:text-3xl my-2 bg-transparent outline-none w-full truncate px-1 -mx-1 border-b border-dashed border-transparent focus:border-primary/70 focus:bg-primary/5 hover:border-base-content/40 hover:bg-base-200/40 rounded-sm transition-colors caret-primary"
          />
          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 group-focus-within:opacity-80 transition-opacity text-base-content/60 pr-1">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </span>
        </div>
      </div>

      <div className="bg-base-100 p-2 rounded-md">
        <Folder moduleData={roles} entityType="role" onClick={() => handleAddEntityOpen("role")} onDelete={handleDeleteEntity} />
        <Folder moduleData={items} entityType="item" onClick={() => handleAddEntityOpen("item")} onDelete={handleDeleteEntity} />
        <Folder moduleData={locations} entityType="location" onClick={() => handleAddEntityOpen("location")} onDelete={handleDeleteEntity} />
      </div>

      <AddEntityToScene
        isOpen={isOpen}
        onClose={handleClose}
        stageId={stageId as number}
        entityType={editEntityType}
        existIdSet={
          editEntityType === "item"
            ? (localClue.items || [])
            : editEntityType === "role"
              ? (localClue.roles || [])
              : (localClue.locations || [])
        }
        onConfirm={entities => handleAddEntity(entities)}
      />
    </div>
  );
}
