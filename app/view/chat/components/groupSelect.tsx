import DialogueWindow from "@/view/chat/components/dialogueWindow";
import { tuanchat } from "api/instance";
import React, { useEffect, useState } from "react";

export default function GroupSelect() {
  // 一级群组列表数据
  const [mainGroups, setMainGroups] = useState<Group[]>([]);
  // 当前展开二级群组的一级群组
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  // 当前选中的二级群组ID
  const [activeSubGroupId, setActiveSubGroupId] = useState<number | null>(null);

  // 定义群组
  interface Group {
    id: number;
    name: string;
    icon: string;
    children?: Group[];
  }

  // 展开二级群组
  const unfoldSubGroup = (mainGroupId: number) => {
    setOpenGroup(openGroup === mainGroupId ? null : mainGroupId);
  };

  // 初始化群组列表
  const initGroups = async () => {
    try {
      const response = await tuanchat.service.getUserGroups();
      if (response.data) {
        // 分离一级群组和二级群组
        const firstLevelGroups = response.data.filter(group => group.parentGroupId === group.roomId);
        const secondLevelGroups = response.data;

        // 更新群组列表
        setMainGroups(firstLevelGroups.map(mainGroup => ({
          id: Number(mainGroup.roomId),
          name: mainGroup.name,
          icon: mainGroup.avatar,
          children: secondLevelGroups
            .filter(subGroup => subGroup.parentGroupId === mainGroup.roomId)
            .map(subGroup => ({
              id: Number(subGroup.roomId),
              name: subGroup.name,
              icon: subGroup.avatar,
              hasNotification: false,
            })),
        })));
      }
    }
    catch (error) {
      console.error("获取群组列表失败:", error);
    }
  };

  // 初始化时获取群组列表
  useEffect(() => {
    initGroups();
  }, []);

  return (
    <div className="flex flex-row w-full">
      <div className="channel-selector flex">
        <ul className="menu w-[300px] bg-neutral">
          {mainGroups.map(mainGroup => (
            <React.Fragment key={mainGroup.id}>
              <li>
                <button
                  type="button"
                  className="flex items-center w-full"
                  onClick={() => unfoldSubGroup(mainGroup.id)}
                >
                  <div className="avatar">
                    <div className="mask mask-squircle w-8">
                      <img
                        src={mainGroup.icon}
                        alt={mainGroup.name}
                      />
                    </div>
                  </div>
                  <span className="ml-2 text-base-content/60">{mainGroup.name}</span>
                  <span className="ml-auto text-base-content">
                    {openGroup === mainGroup.id ? "▼" : "▶"}
                  </span>
                </button>
              </li>
              {openGroup === mainGroup.id && mainGroup.children && (
                <li>
                  <ul className="pl-4">
                    {mainGroup.children.map(subGroup => (
                      <li key={subGroup.id}>
                        <button
                          type="button"
                          className="flex items-center w-full"
                          onClick={() => setActiveSubGroupId(subGroup.id)}
                        >
                          <div className="avatar">
                            <div className="mask mask-squircle w-8">
                              <img
                                src={subGroup.icon}
                                alt={subGroup.name}
                              />
                            </div>
                          </div>
                          <span className="ml-2 text-base-content/60">{subGroup.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
            </React.Fragment>
          ))}
        </ul>
      </div>
      <DialogueWindow groupId={activeSubGroupId ?? 1} key={activeSubGroupId ?? 1} />
    </div>
  );
}
