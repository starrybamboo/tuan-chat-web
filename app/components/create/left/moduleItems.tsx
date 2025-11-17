import { useAddEntityMutation, useAddRoleMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import * as React from "react";
import CreateRole from "./components/createRole";
import ItemList from "./components/itemList";
import { LocationList } from "./components/LocationList";
import RoleList from "./components/roleList";

// 与后端 entityType 对齐的类型：1 物品 | 2 角色 | 4 地点
type EntityType = 1 | 2 | 4;

// 与 content-manager 风格一致的 Tab 触发按钮（图标 + 文案，四等分）
function TabTriggerButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const baseTrigger = "inline-flex items-center justify-center gap-1 rounded-md text-sm h-9 px-3 transition-colors border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const className = `${baseTrigger} ${selected ? "bg-base-200 text-base-content border-base-300" : "text-base-content/70 hover:bg-base-200/70 border-transparent"}`;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// const sections = ["角色", "物品", "场景"];
function ModuleItems({ stageId }: { stageId: number }) {
  // 全局实体搜索（角色/物品/地点/剧情）
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<EntityType>(2);
  // 删除模式相关功能已移除
  // 明确映射，避免字符串裁剪等错误
  const tabMeta = React.useMemo(
    () => ({
      2: { label: "角色" as const },
      1: { label: "物品" as const },
      4: { label: "地点" as const },
    }),
    [],
  );
  const activeTabLabel = tabMeta[activeTab].label;

  // 查询当前所有实体，便于生成唯一名称
  const { data } = useQueryEntitiesQuery(stageId);
  const entities = React.useMemo(() => data?.data ?? [], [data]);
  const listByType = React.useMemo(() => ({
    1: entities.filter(e => e.entityType === 1), // item
    2: entities.filter(e => e.entityType === 2), // role
    4: entities.filter(e => e.entityType === 4), // location
  }), [entities]);
  const counts = React.useMemo(() => ({
    role: listByType[2]?.length ?? 0,
    item: listByType[1]?.length ?? 0,
    location: listByType[4]?.length ?? 0,
  }), [listByType]);
  const activeCount = React.useMemo(() => (
    activeTab === 2 ? counts.role : activeTab === 1 ? counts.item : counts.location
  ), [activeTab, counts]);

  // 各类实体创建
  const { mutate: addItem } = useAddEntityMutation(1);
  const { mutate: addRole } = useAddEntityMutation(2);
  const { mutate: attachRoleToStage } = useAddRoleMutation();
  const { mutate: addLocation } = useAddEntityMutation(4);

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

  // 角色创建弹窗控制
  const [isCreateRoleOpen, setIsCreateRoleOpen] = React.useState(false);

  const handleCreate = () => {
    const type = activeTab;
    if (type === 2) {
      // 角色：改为打开 CreateRole 弹窗，实际创建/选择逻辑移到下方
      setIsCreateRoleOpen(true);
      return;
    }
    if (type === 1) {
      // 物品
      const name = getUniqueName("新物品", listByType[1]);
      addItem({
        stageId,
        name,
        entityInfo: {
          tip: "悄悄地告诉kp",
          description: "新物品です",
          image: "/favicon.ico",
        },
      });
      return;
    }
    if (type === 4) {
      // 地点
      const name = getUniqueName("新地点", listByType[4]);
      addLocation({
        stageId,
        name,
        entityInfo: {
          tip: "给予的提示",
          description: "新场景です",
          image: "/favicon.ico",
        },
      });
    }
  };

  // 处理 CreateRole 弹窗确认选择（将选中的角色绑定到当前 stage）
  const handleAttachSelectedRoles = (selectedRoles: Array<{ id: number }>) => {
    selectedRoles.forEach((r) => {
      attachRoleToStage({ stageId, roleId: r.id, type: 1 });
    });
  };

  // 处理 CreateRole 弹窗内批量创建新角色
  const [roleCounter, setRoleCounter] = React.useState(0);
  const handleCreateNewRole = (sum: number) => {
    try {
      let newCounter = roleCounter;
      for (let j = 1; j <= sum; j++) {
        let name = `新角色${newCounter}`;
        while (listByType[2]?.some((role: any) => role.name === name)) {
          newCounter++;
          name = `新角色${newCounter}`;
        }
        addRole({
          stageId,
          name,
          entityInfo: {
            avatarIds: [],
            description: "无",
            speakerName: "无",
            modelName: "无",
            type: 0,
            ability: {},
            act: {},
          },
        });
        newCounter++;
      }
      setRoleCounter(newCounter);
    }
    catch (e) {
      console.error("创建角色失败:", e);
    }
  };

  const iconClass = "h-4 w-4";

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Tab 切换（样式参考 content-manager：三列 + 图标 + 选中态） */}
      <div className="px-2 pt-2">
        <div role="tablist" aria-label="实体分类" className="grid w-full grid-cols-3 gap-2">
          <TabTriggerButton selected={activeTab === 2} onClick={() => setActiveTab(2)}>
            {/* Users icon */}
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>NPC</span>
          </TabTriggerButton>
          <TabTriggerButton selected={activeTab === 1} onClick={() => setActiveTab(1)}>
            {/* Package icon */}
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16.5 9.4 7.5 4.21" />
              <path d="m21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="M3.3 7L12 12l8.7-5M12 22V12" />
            </svg>
            <span>物品</span>
          </TabTriggerButton>
          <TabTriggerButton selected={activeTab === 4} onClick={() => setActiveTab(4)}>
            {/* MapPin icon */}
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>地点</span>
          </TabTriggerButton>
        </div>
      </div>

      {/* 统一搜索 */}
      <div className="px-4 py-2 border-b border-base-300">
        <label className="input input-bordered flex items-center gap-2">
          <svg className="h-4 w-4 opacity-70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            className="grow"
            placeholder="搜索实体（角色/物品/地点）..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </label>
      </div>

      {/* 当前 Tab 头部（标题 + 数量 + 新建） */}
      <div className="px-4 py-2 border-b border-base-300 flex items-center justify-between gap-2">
        <h3>
          <span>{activeTabLabel}</span>
          <span> 列表 </span>
          <span>(</span>
          <span>{activeCount}</span>
          <span>)</span>
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate} aria-label={`新建${activeTabLabel}`}>
            新建
          </button>
        </div>
      </div>

      {/* 仅渲染当前 Tab 的列表（受全局搜索控制） */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 2 && <RoleList stageId={stageId} searchQuery={searchQuery} showCreateButton={false} />}
        {activeTab === 1 && <ItemList stageId={stageId} searchQuery={searchQuery} showCreateButton={false} />}
        {activeTab === 4 && <LocationList stageId={stageId} searchQuery={searchQuery} showCreateButton={false} />}
      </div>

      {/* 角色创建/选择弹窗（仅在角色 Tab 下使用） */}
      <CreateRole
        isOpen={isCreateRoleOpen}
        onClose={() => setIsCreateRoleOpen(false)}
        onConfirm={handleAttachSelectedRoles}
        onCreateNew={handleCreateNewRole}
        multiSelect={true}
        existIdSet={new Set(listByType[2]?.map((i: any) => i.id?.toString()).filter(Boolean))}
      />
    </div>
  );
}

export default ModuleItems;
