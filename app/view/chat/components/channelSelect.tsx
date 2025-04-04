import { tuanchat } from "api/instance";
import { useEffect, useState } from "react";
// import { useNavigate} from "react-router";
import "./channelSelect.css";

export default function CannelSelect() {
  // 服务器列表数据
  const [servers, setServers] = useState<Server[]>([]);
  // 当前选中的服务器ID
  const [activeServerId, setActiveServerId] = useState<number | null>(null);
  // 当前选中的二级群组ID
  const [activeSubGroupId, setActiveSubGroupId] = useState<number | null>(null);
  // 更新路由函数
  // const navigate = useNavigate();

  // 定义服务器和频道的接口
  interface Server {
    id: number;
    name: string;
    icon: string;
    hasNotification: boolean;
    children?: Server[];
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
  const updateSubGroups = (serverId: number) => {
    const server = servers.find(s => s.id === serverId);
    if (server && server.children && server.children.length > 0) {
      // 默认选中第一个二级群组
      const firstSubGroup = server.children[0];
      setActiveSubGroupId(firstSubGroup.id);
      switchSubGroup(firstSubGroup.id);
    }
  };

  // 初始化服务器列表
  const initServers = async () => {
    try {
      const response = await tuanchat.groupController.getUserGroups();
      if (response.data) {
        // 分离一级群组和二级群组
        const firstLevelGroups = response.data.filter(group => group.parentGroupId === group.roomId);
        const secondLevelGroups = response.data;

        // 更新服务器列表，将二级群组作为一级群组的子元素
        setServers(firstLevelGroups.map(group => ({
          id: Number(group.roomId),
          name: group.name,
          icon: group.avatar || "🏠",
          hasNotification: false,
          children: secondLevelGroups
            .filter(subGroup => subGroup.parentGroupId === group.roomId)
            .map(subGroup => ({
              id: Number(subGroup.roomId),
              name: subGroup.name,
              icon: subGroup.avatar || "📚",
              hasNotification: false,
            })),
        })));

        // 如果有群组，默认选中第一个
        if (servers.length > 0) {
          setActiveServerId(servers[0].id);
          updateSubGroups(servers[0].id);
        }
      }
    }
    catch (error) {
      console.error("获取群组列表失败:", error);
    }
  };

  // 初始化时设置默认群组并获取群组列表
  useEffect(() => {
    initServers();
    // 设置默认选中的频道为当前数组
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  return (
    <div className="channel-selector flex">
      {/* 服务器列表容器 */}
      <div className="server-list primary-servers w-1/2">
        {servers.map(server => (
          <div
            key={server.id}
            className={`server-item ${server.hasNotification ? "has-notification" : ""} ${activeServerId === server.id ? "active" : ""}`}
            onClick={() => {
              setActiveServerId(server.id);
              updateSubGroups(server.id);
            }}
          >
            <div className="server-icon">
              {server.icon.startsWith("http")
                ? (
                    <img
                      src={server.icon}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "🏠";
                      }}
                      alt={server.name}
                    />
                  )
                : (
                    <span>{server.icon}</span>
                  )}
            </div>
            <div className="server-name">{server.name}</div>
            {server.hasNotification && <div className="notification-dot"></div>}
          </div>
        ))}
      </div>

      {/* 二级群组列表 */}
      <div className="server-list secondary-servers w-1/2">
        {activeServerId && servers.find(s => s.id === activeServerId)?.children?.map(subGroup => (
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
  );
}
