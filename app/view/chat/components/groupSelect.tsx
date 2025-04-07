import DialogueWindow from "@/view/chat/components/dialogueWindow";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { Collapse, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
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
        <List
          sx={{ width: 300, bgcolor: "#2f3136" }}
          component="nav"
        >
          {mainGroups.map(mainGroup => (
            <React.Fragment key={mainGroup.id}>
              <ListItem disablePadding>
                <ListItemButton onClick={() => unfoldSubGroup(mainGroup.id)}>
                  <ListItemIcon>
                    <img
                      src={mainGroup.icon}
                      alt={mainGroup.name}
                      style={{ width: "32px", height: "32px" }}
                    />
                    <ListItemText
                      primary={mainGroup.name}
                      sx={{
                        ml: 2,
                        color: "#96989d",
                      }}
                    />
                    {openGroup === mainGroup.id ? <ExpandLess sx={{ color: "white" }} /> : <ExpandMore sx={{ color: "white" }} />}
                  </ListItemIcon>
                </ListItemButton>
              </ListItem>
              <Collapse in={openGroup === mainGroup.id} timeout="auto" unmountOnExit>
                <List component="nav" disablePadding>
                  {mainGroup.children && mainGroup.children.map(subGroup => (
                    <ListItem key={subGroup.id}>
                      <ListItemButton sx={{ pl: 4 }} onClick={() => setActiveSubGroupId(subGroup.id)}>
                        <ListItemIcon>
                          <img
                            src={subGroup.icon}
                            alt={subGroup.name}
                            style={{ width: "32px", height: "32px" }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={subGroup.name}
                          sx={{
                            color: "#96989d",
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      </div>
      <DialogueWindow groupId={activeSubGroupId ?? 1} key={activeSubGroupId ?? 1} />
    </div>
  );
}
