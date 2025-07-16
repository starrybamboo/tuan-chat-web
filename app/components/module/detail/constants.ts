// 默认模块数据 - 使用更真实的默认值避免假数据错觉
export const DEFAULT_MODULE_DATA = {
  moduleId: 1,
  ruleId: 1,
  moduleName: "加载中...",
  description: "正在获取模块信息...",
  userId: undefined as number | undefined,
  authorName: null as string | null,
  minTime: null as number | null,
  maxTime: null as number | null,
  parent: null as string | null,
  minPeople: null as number | null,
  maxPeople: null as number | null,
  image: "https://imagebucket-1322308688.cos.ap-tokyo.myqcloud.com/picnia/image/65d2fa0e1c42c75df8dd3713.jpg",
  createTime: null as string | null,
  updateTime: null as string | null,
};

export type ModuleData = typeof DEFAULT_MODULE_DATA;
