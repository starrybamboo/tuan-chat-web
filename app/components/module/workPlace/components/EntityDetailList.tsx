import type { StageEntityResponse } from "api";
import RoleAvatar from "@/components/common/roleAvatar";
import { useCallback, useEffect, useState } from "react";

function EntityDetailListItem({ entity, isSelected, onChange }: { entity: StageEntityResponse; isSelected?: boolean; onChange?: (name: string) => void }) {
  const handleSelectItem = useCallback(() => {
    if (onChange && entity.name) {
      onChange(entity.name);
    }
  }, [onChange, entity]);

  return (
    <div className="flex flex-col items-center w-20 h-24">
      <div className="flex items-center justify-center h-16">
        <div
          className={`w-16 h-16 rounded-full cursor-pointer transition-all duration-200 ease-in-out hover:scale-110 ${isSelected
            ? "border-4 border-accent shadow-lg"
            : "border-2 border-transparent hover:border-accent/50"
          }`}
          onClick={handleSelectItem}
        >
          <RoleAvatar avatarId={entity.entityInfo?.avatarId || entity.entityInfo!.avatarIds[0]} width={16} isRounded={true} stopPopWindow={true}></RoleAvatar>
        </div>
      </div>
      <div className="text-xs mt-1 w-full truncate text-center" title={entity.name}>{entity.name}</div>
    </div>
  );
}

function EntityDetail({ name, entityList }: { name: string; entityList: StageEntityResponse[] }) {
  const entityData = entityList.find(entity => entity.name === name);

  if (!name) {
    return (
      <div className="flex h-full w-full items-center justify-center text-accent">
        请选择一个查看详细信息
      </div>
    );
  }

  const entityInfo = entityData?.entityInfo;

  if (!entityData || !entityInfo) {
    return (
      <div className="flex h-full w-full items-center justify-center text-accent">
        未找到实体信息
      </div>
    );
  }

  // 获取角色类型显示文本
  const getEntityTypeText = (type?: number) => {
    if (type === 0)
      return "NPC";
    if (type === 1)
      return "预设卡";
    return "未知";
  };

  // 渲染能力值
  const renderAbilities = (abilities?: Record<string, number>) => {
    if (!abilities || Object.keys(abilities).length === 0) {
      return <span className="text-base-content/60">未设置</span>;
    }
    return (
      <div className="grid grid-cols-2 gap-1">
        {Object.entries(abilities).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span>
              {key}
              :
            </span>
            <span className="font-mono">{value}</span>
          </div>
        ))}
      </div>
    );
  };

  // 渲染行为设定
  const renderActions = (actions?: Record<string, string>) => {
    if (!actions || Object.keys(actions).length === 0) {
      return <span className="text-base-content/60">未设置</span>;
    }
    return (
      <div className="space-y-1">
        {Object.entries(actions).map(([key, value]) => (
          <div key={key} className="text-sm">
            <span className="font-medium">
              {key}
              :
            </span>
            <span className="ml-2">{value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-128 w-full flex gap-2 overflow-y-scroll">
      <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-lg w-full">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-accent">{entityData.name || "未命名"}</h1>
          <span className="px-3 py-1 text-base bg-accent/10 text-accent rounded-full whitespace-nowrap">
            {getEntityTypeText(entityInfo.type)}
          </span>
        </div>
        <div className="divider my-0" />
        {/* 头像展示 */}
        {entityInfo.avatar && (
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-base-content/60">头像</h4>
            <div className="w-32 h-32 rounded-lg overflow-hidden border border-base-300">
              <img
                src={entityInfo.avatar || "/favicon.ico"}
                alt={entityData.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
        {/* 实体描述（统一为ItemDetail样式） */}
        {entityInfo.description && (
          <div className="w-full">
            <h4 className="font-semibold text-lg text-accent mb-2">实体简介</h4>
            <p className="bg-info/10 text-accent p-3 rounded-lg">
              {entityInfo.description}
            </p>
          </div>
        )}
        {/* TTS 相关信息 */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-base-content/60">语音模型</span>
            <span className="font-mono text-sm">
              {entityInfo.modelName || "未设置"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base-content/60">说话人</span>
            <span className="font-mono text-sm">
              {entityInfo.speakerName || "未设置"}
            </span>
          </div>
        </div>
        {/* 能力值展示（统一样式） */}
        {entityInfo.ability && (
          <div className="w-full">
            <h4 className="font-semibold text-lg mb-2 text-green-600">能力值</h4>
            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-200">
              {renderAbilities(entityInfo.ability)}
            </div>
          </div>
        )}
        {/* 行为设定展示（统一样式） */}
        {entityInfo.act && (
          <div className="w-full">
            <h4 className="font-semibold text-lg mb-2 text-blue-600">行为设定</h4>
            <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-200">
              {renderActions(entityInfo.act)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface EntityDetailListProps {
  moduleData: StageEntityResponse[];
}
export default function EntityDetailList({ moduleData }: EntityDetailListProps) {
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const entityList = moduleData;

  const setName = useCallback((name: string) => {
    setSelectedName(name);
  }, []);

  useEffect(() => {
    if (entityList.length > 0 && selectedName === null) {
      const firstName = entityList[0].name ?? "";
      if (firstName) {
        setName(firstName);
      }
    }
  }, [entityList, selectedName, setName]);

  return (
    <div className="flex w-full flex-col max-w-screen md:flex-row md:min-h-128 bg-base-100 h-128">
      <div className="basis-92 shrink-0 flex flex-wrap p-1 gap-2 justify-start items-start">
        {entityList.length > 0
          ? entityList.map((entity) => {
              const name = entity.name ?? "未命名";
              return (
                <EntityDetailListItem
                  key={name}
                  entity={entity}
                  isSelected={selectedName === name}
                  onChange={setName}
                />
              );
            })
          : (
              <div className="w-full text-center text-accent py-8">没有数据</div>
            )}
      </div>
      <div className="grow p-2 border-l-2 border-base-content/10 border-solid">
        {selectedName
          ? (
              <EntityDetail name={selectedName} entityList={entityList} />
            )
          : (
              <div className="flex h-full w-full items-center justify-center text-accent">
                请选择一个查看详细信息
              </div>
            )}
      </div>
    </div>
  );
}
