import { useModuleInfoQuery } from "api/hooks/moduleQueryHooks";
import { useCallback, useEffect, useState } from "react";
import { getEntityListByType } from "./moduleUtils";

function RoleAvatar(
  { roleId, avatar, isSelected, onChange }: {
    roleId: number;
    avatar?: string;
    isSelected?: boolean;
    onChange?: (roleId: number) => void;
  },
) {
  const handleSelectRole = useCallback(() => {
    if (onChange) {
      onChange(roleId);
    }
  }, [onChange, roleId]);

  return (
    <div className="avatar h-16">
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
  );
}

function RoleDetail(
  { roleId, roleList }: { roleId: number; roleList: any[] },
) {
  // 尝试多种方式查找角色
  const roleData = roleList.find((role) => {
    const info = role.entityInfo;
    return info?.moduleRoleId === roleId;
  }) || roleList[roleId]; // 如果没找到，尝试用index直接访问

  if (!roleId) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        请选择一个角色
      </div>
    );
  }

  const roleInfo = roleData?.entityInfo;

  // 处理可能的字段名差异
  const normalizedRoleInfo = roleInfo
    ? {
        roleId: roleInfo.moduleRoleId,
        roleName: roleInfo.roleName,
        avatar: roleInfo.avatar,
        description: roleInfo.description,
        type: roleInfo.type,
        modelName: roleInfo.modelName,
        speakerName: roleInfo.speakerName,
        ability: roleInfo.ability,
        act: roleInfo.act,
        createTime: roleInfo.createTime || roleInfo.create_time,
        updateTime: roleInfo.updateTime || roleInfo.update_time,
        state: roleInfo.state,
      }
    : null;

  if (!roleData || !normalizedRoleInfo) {
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
          <h2 className="text-xl font-bold">{normalizedRoleInfo?.roleName}</h2>
          <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
            ID:
            {" "}
            {normalizedRoleInfo?.roleId}
          </span>
          <span className="px-2 py-1 text-xs bg-secondary/10 text-secondary rounded-full">
            {getRoleTypeText(normalizedRoleInfo?.type)}
          </span>
          {normalizedRoleInfo?.state !== undefined && (
            <span className={`px-2 py-1 text-xs rounded-full ${normalizedRoleInfo.state === 0
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
            }`}
            >
              {normalizedRoleInfo.state === 0 ? "正常" : "归档"}
            </span>
          )}
        </div>

        {/* 角色描述 */}
        {normalizedRoleInfo?.description && (
          <div className="text-base-content/80">
            <h4 className="text-sm font-medium mb-2">角色描述</h4>
            <p className="whitespace-pre-wrap text-sm">{normalizedRoleInfo.description}</p>
          </div>
        )}

        {/* TTS 相关信息 */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-base-content/60">语音模型</span>
            <span className="font-mono text-xs">
              {normalizedRoleInfo?.modelName || "未设置"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base-content/60">说话人</span>
            <span className="font-mono text-xs">
              {normalizedRoleInfo?.speakerName || "未设置"}
            </span>
          </div>
        </div>

        {/* 时间信息 */}
        {(normalizedRoleInfo?.createTime || normalizedRoleInfo?.updateTime) && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {normalizedRoleInfo?.createTime && (
              <div className="flex flex-col gap-1">
                <span className="text-base-content/60">创建时间</span>
                <span className="font-mono text-xs">
                  {new Date(normalizedRoleInfo.createTime).toLocaleString("zh-CN")}
                </span>
              </div>
            )}
            {normalizedRoleInfo?.updateTime && (
              <div className="flex flex-col gap-1">
                <span className="text-base-content/60">更新时间</span>
                <span className="font-mono text-xs">
                  {new Date(normalizedRoleInfo.updateTime).toLocaleString("zh-CN")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 能力值 */}
        {normalizedRoleInfo?.ability && (
          <div className="text-sm">
            <h4 className="text-base-content/60 mb-2">能力值</h4>
            {renderAbilities(normalizedRoleInfo.ability)}
          </div>
        )}

        {/* 行为设定 */}
        {normalizedRoleInfo?.act && (
          <div className="text-sm">
            <h4 className="text-base-content/60 mb-2">行为设定</h4>
            {renderActions(normalizedRoleInfo.act)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Roles({ moduleId }: { moduleId: number }) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const { data: moduleInfo, isLoading: _isModuleLoading } = useModuleInfoQuery(moduleId);

  // 从模组信息中获取所有角色
  const roleList = getEntityListByType(moduleInfo, "role");

  const setRoleId = useCallback((roleId: number) => {
    setSelectedRoleId(roleId);
  }, []);

  // 自动选择第一个角色的函数
  const selectFirstRole = useCallback(() => {
    if (roleList.length > 0 && selectedRoleId === null) {
      const firstRoleInfo = roleList[0].entityInfo;
      const firstRoleId = firstRoleInfo?.moduleRoleId || firstRoleInfo?.roleId || firstRoleInfo?.id || 0;
      setRoleId(firstRoleId);
    }
  }, [roleList, selectedRoleId, setRoleId]);

  // 当角色列表加载完成且有数据时，自动选择第一个角色
  useEffect(() => {
    selectFirstRole();
  }, [selectFirstRole]);

  return (
    <div className="flex w-full flex-col max-w-screen md:flex-row md:min-h-128 bg-base-200">
      <div className="basis-92 shrink-0 flex flex-wrap p-2 gap-2 h-fit">
        {roleList.length > 0
          ? roleList.map((roleEntity, index) => {
              const roleInfo = roleEntity.entityInfo;

              // 使用 moduleRoleId 或其他字段作为唯一标识
              const roleId = roleInfo?.moduleRoleId || roleInfo?.roleId || roleInfo?.id || index;
              const avatar = roleInfo?.avatar || roleInfo?.avatarUrl || roleInfo?.image;

              return (
                <RoleAvatar
                  key={roleId}
                  roleId={roleId!}
                  avatar={avatar}
                  isSelected={selectedRoleId === roleId}
                  onChange={setRoleId}
                />
              );
            })
          : <div>没有数据</div>}
      </div>
      <div className="grow p-2 border-l-2 border-base-content/10 border-solid">
        {selectedRoleId
          ? (
              <RoleDetail roleId={selectedRoleId} roleList={roleList} />
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
