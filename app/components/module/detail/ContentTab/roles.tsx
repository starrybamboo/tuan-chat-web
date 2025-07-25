import { useModuleInfoQuery } from "api/hooks/moduleQueryHooks";
import { useCallback, useEffect, useState } from "react";
import { getEntityListByType } from "../moduleUtils";

function RoleAvatar(
  { name, avatar, isSelected, onChange }: {
    name: string;
    avatar?: string;
    isSelected?: boolean;
    onChange?: (name: string) => void;
  },
) {
  const handleSelectRole = useCallback(() => {
    if (onChange) {
      onChange(name);
    }
  }, [onChange, name]);

  return (
    <div className="flex flex-col items-center w-20">
      <div className="flex items-center justify-center h-16">
        <div
          className={`w-16 h-16 rounded-full cursor-pointer transition-all duration-200 ease-in-out hover:scale-110 ${isSelected
            ? "border-4 border-primary shadow-lg"
            : "border-2 border-transparent hover:border-primary/50"
          }`}
          onClick={handleSelectRole}
        >
          <img
            src={avatar || "/favicon.ico"}
            alt="角色头像"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </div>
      <div className="text-xs mt-1 w-full truncate text-center" title={name}>{name}</div>
    </div>
  );
}

function RoleDetail(
  { name, roleList }: { name: string; roleList: any[] },
) {
  // 通过 name 查找角色
  const roleData = roleList.find(role => role.name === name);

  if (!name) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        请选择一个角色
      </div>
    );
  }

  const roleInfo = roleData?.entityInfo;

  if (!roleData || !roleInfo) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        未找到角色信息
      </div>
    );
  }

  // 获取角色类型显示文本
  const getRoleTypeText = (type?: number) => {
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

  // 渲染行为
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
    <div className="h-full w-full flex gap-2">

      {/* 角色信息部分 */}
      <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-lg w-full overflow-y-auto">
        {/* 角色名称和基本信息 */}
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-xl font-bold">{roleData.name}</h2>
          <span className="px-2 py-1 text-xs bg-secondary/10 text-secondary rounded-full">
            {getRoleTypeText(roleInfo.type)}
          </span>
        </div>
        {roleInfo.description && (
          <div className="text-base-content/80">
            <h4 className="text-sm font-medium mb-2">角色简介</h4>
            <p className="whitespace-pre-wrap text-sm">{roleInfo.description}</p>
          </div>
        )}

        {/* TTS 相关信息 */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-base-content/60">语音模型</span>
            <span className="font-mono text-xs">
              {roleInfo.modelName || "未设置"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base-content/60">说话人</span>
            <span className="font-mono text-xs">
              {roleInfo.speakerName || "未设置"}
            </span>
          </div>
        </div>
        {roleInfo.ability && (
          <div className="text-sm">
            <h4 className="text-base-content/60 mb-2">能力值</h4>
            {renderAbilities(roleInfo.ability)}
          </div>
        )}
        {roleInfo.act && (
          <div className="text-sm">
            <h4 className="text-base-content/60 mb-2">行为设定</h4>
            {renderActions(roleInfo.act)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Roles({ moduleId }: { moduleId: number }) {
  const { data: moduleInfo } = useModuleInfoQuery(moduleId);

  // 获取所有角色，name为唯一标识符
  const roleList = getEntityListByType(moduleInfo, "role");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const setName = useCallback((name: string) => {
    setSelectedName(name);
  }, []);

  // 自动选择第一个角色
  const selectFirst = useCallback(() => {
    if (roleList.length > 0 && selectedName === null) {
      const firstName = roleList[0].name ?? "";
      if (firstName)
        setName(firstName);
    }
  }, [roleList, selectedName, setName]);

  useEffect(() => {
    selectFirst();
  }, [selectFirst]);

  return (
    <div className="flex w-full flex-col max-w-screen md:flex-row md:min-h-128 bg-base-100">
      <div className="basis-92 shrink-0 flex flex-wrap p-2 gap-2 h-fit">
        {roleList.length > 0
          ? roleList.map((roleEntity) => {
              const roleInfo = roleEntity.entityInfo;
              const name = roleEntity.name ?? "";
              const avatar = roleInfo?.avatar;
              if (!name)
                return null;
              return (
                <RoleAvatar
                  key={name}
                  name={name}
                  avatar={avatar}
                  isSelected={selectedName === name}
                  onChange={setName}
                />
              );
            })
          : <div>没有数据</div>}
      </div>
      <div className="grow p-2 border-l-2 border-base-content/10 border-solid">
        {selectedName
          ? (
              <RoleDetail name={selectedName} roleList={roleList} />
            )
          : (
              <div className="flex h-full w-full items-center justify-center text-base-content/50">
                请选择一个角色
              </div>
            )}
      </div>
    </div>
  );
}
