export type command = {
  name: string;
  priority: number;
  description: string;
};

export const commands: command[] = [
  { name: "help", priority: 3, description: "显示帮助信息" },
  { name: "search", priority: 2, description: "执行内容搜索" },
  { name: "history", priority: 1, description: "查看历史记录" },
  { name: "clear", priority: 5, description: "清空当前对话" },
  { name: "settings", priority: 4, description: "打开设置面板" },
];
