import DialogueWindow from "@/view/chat/components/dialogueWindow";
import { tuanchat } from "api/instance";
import { useEffect, useState } from "react";
// import { useNavigate} from "react-router";
import "./groupSelect.css";

export default function GroupSelect() {
  // 一级群组列表数据
  const [mainGroups, setMainGroups] = useState<Group[]>([]);
  // 当前选中的一级群组ID
  const [activeMainGroupId, setActiveMainGroupId] = useState<number | null>(null);
  // 当前选中的二级群组ID
  const [activeSubGroupId, setActiveSubGroupId] = useState<number | null>(null);
  // 更新路由函数
  // const navigate = useNavigate();

  // 定义群组
  interface Group {
    id: number;
    name: string;
    icon: string;
    hasNotification: boolean;
    children?: Group[];
  }

  // 切换二级群组
  const switchSubGroup = (subGroupId: number) => {
    // 更新选中状态
    setActiveSubGroupId(subGroupId);
    // 更新当前群组ID
    // TODO
    // 更新路由
    // navigate(`/chat/${subGroupId}`);
    // 调用ChatContent组件的初始化方法
    // if (chatContentRef?.current?.initializeChat) {
    //     chatContentRef.current.initializeChat(subGroupId);
    // }
  };

  // 更新二级群组列表
  const updateSubGroups = (mainGroupId: number) => {
    const mainGroup = mainGroups.find(s => s.id === mainGroupId);
    if (mainGroup && mainGroup.children && mainGroup.children.length > 0) {
      // 默认选中第一个二级群组
      const firstSubGroup = mainGroup.children[0];
      setActiveSubGroupId(firstSubGroup.id);
      switchSubGroup(firstSubGroup.id);
    }
  };

  // 初始化群组列表
  const initGroups = async () => {
    try {
      const response = await tuanchat.groupController.getUserGroups();
      if (response.data) {
        // 分离一级群组和二级群组
        const firstLevelGroups = response.data.filter(group => group.parentGroupId === group.roomId);
        const secondLevelGroups = response.data;

        // 更新服务器列表，将二级群组作为一级群组的子元素
        setMainGroups(firstLevelGroups.map(mainGroup => ({
          id: Number(mainGroup.roomId),
          name: mainGroup.name,
          icon: mainGroup.avatar || "🏠",
          hasNotification: false,
          children: secondLevelGroups
            .filter(subGroup => subGroup.parentGroupId === mainGroup.roomId)
            .map(subGroup => ({
              id: Number(subGroup.roomId),
              name: subGroup.name,
              icon: subGroup.avatar || "📚",
              hasNotification: false,
            })),
        })));

        // 如果有一级群组，默认选中第一个
        if (mainGroups.length > 0) {
          setActiveMainGroupId(mainGroups[0].id);
          updateSubGroups(mainGroups[0].id);
        }
      }
    }
    catch (error) {
      console.error("获取群组列表失败:", error);
    }
  };

  // 初始化时设置默认群组并获取群组列表
  useEffect(() => {
    initGroups();
    // 设置默认选中的频道为当前数组
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  return (
    <div className="flex flex-row w-full">
      <div className="channel-selector flex">
        {/* 一级群组列表容器 */}
        <div className="server-list primary-servers">
          {mainGroups.map(mainGroup => (
            <div
              key={mainGroup.id}
              className={`server-item ${mainGroup.hasNotification ? "has-notification" : ""} ${activeMainGroupId === mainGroup.id ? "active" : ""}`}
              onClick={() => {
                setActiveMainGroupId(mainGroup.id);
                updateSubGroups(mainGroup.id);
              }}
            >
              <div className="server-icon">
                {mainGroup.icon.startsWith("http")
                  ? (
                      <img
                        src={mainGroup.icon}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "🏠";
                        }}
                        alt={mainGroup.name}
                      />
                    )
                  : (
                      <span>{mainGroup.icon}</span>
                    )}
              </div>
              <div className="server-name">{mainGroup.name}</div>
              {mainGroup.hasNotification && <div className="notification-dot"></div>}
            </div>
          ))}
        </div>

        {/* 二级群组列表 */}
        <div className="server-list secondary-servers w-1/2">
          {activeMainGroupId && mainGroups.find(s => s.id === activeMainGroupId)?.children?.map(subGroup => (
            <div
              key={subGroup.id}
              className={`server-item ${subGroup.hasNotification ? "has-notification" : ""} ${activeSubGroupId === subGroup.id ? "active" : ""}`}
              onClick={() => switchSubGroup(subGroup.id)}
            >
              <div className="server-icon">
                {subGroup.icon.startsWith("http")
                  ? (
                      <img
                        src={subGroup.icon}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "📚";
                        }}
                        alt={subGroup.name}
                      />
                    )
                  : (
                      <span>{subGroup.icon}</span>
                    )}
              </div>
              <div className="server-name">{subGroup.name}</div>
              {subGroup.hasNotification && <div className="notification-dot"></div>}
            </div>
          ))}
        </div>
      </div>
      <DialogueWindow groupId={activeSubGroupId ?? 1} key={activeSubGroupId ?? 1} />
    </div>

  );
}
