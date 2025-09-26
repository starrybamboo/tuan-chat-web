import ScrollList from "@/components/common/list/scrollList";

// 定义列表项类型
interface UserItem {
  id: number;
  name: string;
  avatar: string;
}

/**
 * RuleCreateRequest，规则创建请求对象
 */
export interface RuleFormValues {
  /**
   * 数值相关默认值，如力量、敏捷等属性值
   */
  abilityDefault: { [key: string]: { [key: string]: any } };
  /**
   * 表演相关字段模板，如性别、年龄等信息
   */
  actTemplate: { [key: string]: string };
  /**
   * 规则描述
   */
  ruleDescription?: string;
  /**
   * 规则名称
   */
  ruleName?: string;
  [property: string]: any;
}

// 定义渲染组件
const UserListItem: React.FC<{ item: UserItem }> = ({ item }) => (
  <div className="w-full flex-grow flex items-center gap-2">
    <img src={item.avatar} className="avatar w-8 h-8 rounded" />
    <span>{item.name}</span>
  </div>
);

function RuleForm() {
  const users: UserItem[] = [
    { id: 1, name: "用户1", avatar: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" },
    { id: 2, name: "用户2", avatar: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" },
    { id: 3, name: "用户2", avatar: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" },
    { id: 4, name: "用户2", avatar: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" },
    { id: 5, name: "用户2", avatar: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" },
    { id: 6, name: "用户2", avatar: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" },
    { id: 7, name: "用户2", avatar: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" },
    { id: 8, name: "用户2", avatar: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" },
    { id: 9, name: "用户2", avatar: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" },
    { id: 10, name: "用户2", avatar: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" },
    { id: 11, name: "用户2", avatar: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" },

  ];

  // const {
  //   register,
  //   setValue,
  //   handleSubmit,
  // } = useForm<RuleFormValues>({
  //   mode: "onBlur",
  // });

  return (
    <div className="w-full rounded-xl bg-base-200 flex">
      <div className="p-2 grow min-h-80 max-h-80">
        <ScrollList
          items={users}
          RenderItem={UserListItem}
          pageSize={10}
          className="w-full overflow-y-auto"
        />
      </div>
    </div>
  );
}

export default RuleForm;
