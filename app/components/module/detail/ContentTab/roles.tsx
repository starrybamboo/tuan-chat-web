import { useModuleInfoQuery } from "api/hooks/moduleQueryHooks";
import { useRoleAvatarQuery } from "api/queryHooks";
import { useCallback, useEffect, useState } from "react";
import { getEntityListByType } from "../moduleUtils";

// 可折叠组件
function CollapsibleSection({
  title,
  children,
  titleColor = "text-accent",
  bgColor = "bg-info/10",
  borderColor = "border-info/20",
  defaultExpanded = true,
}: {
  title: string;
  children: React.ReactNode;
  titleColor?: string;
  bgColor?: string;
  borderColor?: string;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="w-full">
      <h4
        className={`font-semibold text-base md:text-lg mb-2 ${titleColor} cursor-pointer flex items-center gap-2 hover:opacity-80 transition-opacity`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>
          {isExpanded ? "▼" : "▶"}
        </span>
        {title}
      </h4>
      {isExpanded && (
        <div className={`${bgColor} p-3 rounded-lg border-l-4 ${borderColor}`}>
          {children}
        </div>
      )}
    </div>
  );
}

// 支持 avatarId 的角色头像组件
function RoleAvatarWithId(
  { name, avatarId, avatar, isSelected, onChange }: {
    name: string;
    avatarId?: number;
    avatar?: string;
    isSelected?: boolean;
    onChange?: (name: string) => void;
  },
) {
  const avatarUrl = useRoleAvatarQuery(avatarId || 0);
  const handleSelectRole = useCallback(() => {
    if (onChange) {
      onChange(name);
    }
  }, [onChange, name]);

  // 优先使用通过 avatarId 获取的头像，然后是 avatar 参数，最后是默认头像
  const displayAvatar = avatarId && avatarUrl ? avatarUrl : (avatar || "/favicon.ico");

  return (
    <div className="flex flex-col items-center w-20">
      <div className="flex items-center justify-center h-16">
        <div
          className={`w-16 h-16 rounded-full cursor-pointer transition-all duration-200 ease-in-out hover:scale-110 ${isSelected
            ? "border-4 border-accent shadow-lg"
            : "border-2 border-transparent hover:border-accent/50"
          }`}
          onClick={handleSelectRole}
        >
          <img
            src={displayAvatar}
            alt="角色头像"
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              // 如果头像加载失败，使用默认头像
              (e.target as HTMLImageElement).src = "/favicon.ico";
            }}
          />
        </div>
      </div>
      <div className="text-xs md:text-xs mt-1 w-full truncate text-center" title={name}>{name}</div>
    </div>
  );
}

// 头像列表组件
function AvatarList({
  avatarIds,
  selectedAvatarId,
  onAvatarSelect,
}: {
  avatarIds?: number[];
  selectedAvatarId?: number;
  onAvatarSelect?: (avatarId: number) => void;
}) {
  if (!avatarIds || avatarIds.length === 0) {
    return (
      <div className="text-base-content/60 text-xs md:text-sm">暂无头像</div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {avatarIds.map(avatarId => (
        <AvatarItem
          key={avatarId}
          avatarId={avatarId}
          isSelected={selectedAvatarId === avatarId}
          onSelect={onAvatarSelect}
        />
      ))}
    </div>
  );
}

// 单个头像项组件
function AvatarItem({
  avatarId,
  isSelected,
  onSelect,
}: {
  avatarId: number;
  isSelected?: boolean;
  onSelect?: (avatarId: number) => void;
}) {
  const avatarUrl = useRoleAvatarQuery(avatarId);

  return (
    <div
      className={`w-16 h-16 rounded-lg overflow-hidden border cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-accent border-2 shadow-lg ring-2 ring-accent/30"
          : "border-base-300 bg-base-200 hover:border-accent/50"
      }`}
      onClick={() => onSelect?.(avatarId)}
    >
      <img
        src={avatarUrl || "/favicon.ico"}
        alt={`头像 ${avatarId}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          // 如果头像加载失败，使用默认头像
          (e.target as HTMLImageElement).src = "/favicon.ico";
        }}
      />
    </div>
  );
}

// 选中头像显示组件
function SelectedAvatar({ avatarId }: { avatarId?: number }) {
  const avatarUrl = useRoleAvatarQuery(avatarId || 0);

  if (!avatarId)
    return null;

  return (
    <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-accent shadow-md">
      <img
        src={avatarUrl || "/favicon.ico"}
        alt="选中头像"
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/favicon.ico";
        }}
      />
    </div>
  );
}

function RoleDetail(
  { name, roleList }: { name: string; roleList: any[] },
) {
  // 管理选中的头像状态
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | undefined>(undefined);

  // 通过 name 查找角色
  const roleData = roleList.find(role => role.name === name);
  const roleInfo = roleData?.entityInfo;

  // 创建设置头像的回调函数
  const updateSelectedAvatar = useCallback(() => {
    if (roleInfo?.avatarIds && roleInfo.avatarIds.length > 0) {
      const newAvatarId = roleInfo.avatarIds[0];
      setSelectedAvatarId((prev) => {
        // 只有当前选中的头像不在新的头像列表中时才重置
        if (!prev || !roleInfo.avatarIds.includes(prev)) {
          return newAvatarId;
        }
        return prev;
      });
    }
    else {
      setSelectedAvatarId(() => undefined);
    }
  }, [roleInfo?.avatarIds]);

  // 当角色切换时，重置为第一个头像
  useEffect(() => {
    updateSelectedAvatar();
  }, [name, updateSelectedAvatar]);

  if (!name) {
    return (
      <div className="flex h-full w-full items-center justify-center text-accent text-sm md:text-base">
        请选择一个角色
      </div>
    );
  }

  if (!roleData || !roleInfo) {
    return (
      <div className="flex h-full w-full items-center justify-center text-accent text-sm md:text-base">
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
      return <span className="text-base-content/60 text-xs md:text-sm">未设置</span>;
    }
    return (
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs md:text-sm">
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
      return <span className="text-base-content/60 text-xs md:text-sm">未设置</span>;
    }
    return (
      <div className="space-y-1">
        {Object.entries(actions).map(([key, value]) => (
          <div key={key} className="text-xs md:text-sm">
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
      <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-lg w-full overflow-y-auto">
        <div className="hidden md:block">
          <div className="flex items-center gap-4">
            <SelectedAvatar avatarId={selectedAvatarId} />
            <h1 className="text-2xl md:text-3xl font-bold text-accent">{roleData.name || "未命名"}</h1>
            <span className="px-3 py-1 text-sm md:text-base bg-accent/10 text-accent rounded-full whitespace-nowrap">
              {getRoleTypeText(roleInfo.type)}
            </span>
          </div>
          <div className="divider my-0" />
        </div>
        <div className="md:hidden flex items-center gap-4">
          <span className="px-3 py-1 text-sm md:text-base bg-accent/10 text-accent rounded-full whitespace-nowrap">
            {getRoleTypeText(roleInfo.type)}
          </span>
        </div>
        {/* 头像列表展示 */}
        {roleInfo.avatarIds && roleInfo.avatarIds.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs md:text-sm font-medium text-base-content/60">头像列表</h4>
            <AvatarList
              avatarIds={roleInfo.avatarIds}
              selectedAvatarId={selectedAvatarId}
              onAvatarSelect={setSelectedAvatarId}
            />
          </div>
        )}
        {/* 主头像展示 */}
        {roleInfo.avatar && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs md:text-sm font-medium text-base-content/60">主头像</h4>
            <div className="w-32 h-32 rounded-lg overflow-hidden border border-base-300">
              <img
                src={roleInfo.avatar}
                alt={roleData.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
        {/* 角色描述（统一为ItemDetail样式） */}
        {roleInfo.description && (
          <div className="w-full">
            <h4 className="font-semibold text-base md:text-lg text-accent mb-2">角色简介</h4>
            <p className="bg-info/10 text-accent p-3 rounded-lg text-sm md:text-base">
              {roleInfo.description}
            </p>
          </div>
        )}
        {/* KP提示（如果有，统一为ItemDetail样式） */}
        {roleInfo.tip && (
          <div className="w-full">
            <h4 className="font-semibold text-base md:text-lg mb-2 text-orange-600">KP提示</h4>
            <p className="text-gray-700 bg-orange-50 p-3 rounded-lg border-l-4 border-orange-200 text-sm md:text-base">
              {roleInfo.tip}
            </p>
          </div>
        )}
        {/* TTS 相关信息 */}
        <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-base-content/60">语音模型</span>
            <span className="font-mono text-xs md:text-sm">
              {roleInfo.modelName || "未设置"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base-content/60">说话人</span>
            <span className="font-mono text-xs md:text-sm">
              {roleInfo.speakerName || "未设置"}
            </span>
          </div>
        </div>
        {/* 行为设定展示（统一样式） */}
        {roleInfo.act && (
          <CollapsibleSection
            title="行为设定"
            titleColor="text-blue-600"
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
          >
            {renderActions(roleInfo.act)}
          </CollapsibleSection>
        )}
        {/* 能力值展示（统一样式） */}
        {roleInfo.ability && (
          <CollapsibleSection
            title="能力值"
            titleColor="text-green-600"
            bgColor="bg-green-50"
            borderColor="border-green-200"
          >
            {renderAbilities(roleInfo.ability)}
          </CollapsibleSection>
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
      {/* 移动端下拉菜单 */}
      <div className="md:hidden">
        <select
          className="select w-full border-0 rounded-none bg-base-200 font-bold text-lg"
          value={selectedName || ""}
          onChange={e => setName(e.target.value)}
        >
          <option value="" disabled>
            {roleList.length > 0 ? "请选择一个角色" : "没有数据"}
          </option>
          {roleList.map((roleEntity) => {
            const name = roleEntity.name ?? "未命名";
            return (
              <option key={name} value={name}>
                {name}
              </option>
            );
          })}
        </select>
      </div>

      {/* 桌面端角色头像列表 */}
      <div className="hidden md:flex basis-92 shrink-0 flex-wrap p-2 gap-2 h-fit">
        {roleList.length > 0
          ? roleList.map((roleEntity) => {
              const roleInfo = roleEntity.entityInfo;
              const name = roleEntity.name ?? "";
              // 优先使用 avatarIds 数组中的第一个头像，如果没有则使用 avatar 字段
              const avatarId = roleInfo?.avatarIds?.[0];
              const avatar = avatarId ? undefined : roleInfo?.avatar; // 如果有 avatarId 就不使用 avatar
              if (!name)
                return null;
              return (
                <RoleAvatarWithId
                  key={name}
                  name={name}
                  avatarId={avatarId}
                  avatar={avatar}
                  isSelected={selectedName === name}
                  onChange={setName}
                />
              );
            })
          : <div className="w-full text-center text-accent py-8 text-sm md:text-base">没有数据</div>}
      </div>
      <div className="grow p-2 md:border-l-2 border-base-content/10 border-solid">
        {selectedName
          ? (
              <RoleDetail name={selectedName} roleList={roleList} />
            )
          : (
              <div className="flex h-full w-full items-center justify-center text-accent text-sm md:text-base">
                请选择一个角色
              </div>
            )}
      </div>
    </div>
  );
}
