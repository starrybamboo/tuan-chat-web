interface ListProps<T> {
  /**
   * 要渲染的数据数组
   */
  items: T[];
  /**
   * 每页显示的数量
   */
  pageSize?: number;
  /**
   * 用于渲染每个 item 的组件
   * 该组件会接收 item 作为 props
   */
  RenderItem: React.ComponentType<{ item: T }>;
  /**
   * 自定义列表容器的类名
   */
  className?: string;
  /**
   * 当前选中项的 id
   */
  selectedId?: string | number | null;
  /**
   * 选中项改变时的回调函数
   */
  onSelect?: (id: string | number) => void;
}

const DEFAULT_ITEMS: never[] = [];

function ScrollList<T extends { id: string | number }>({
  items = DEFAULT_ITEMS,
  pageSize = 10,
  RenderItem,
  className = "",
  selectedId,
  onSelect,
}: ListProps<T>) {
  const handleSelect = (id: string | number) => {
    onSelect?.(id);
  };

  return (
    <ul className={`list w-full h-full bg-base-100 ${className}`}>
      {items.map(item => (
        <li
          key={item.id}
          className={`p-2 border-b border-base-300 last:border-none cursor-pointer hover:bg-base-200 transition-colors
            ${selectedId === item.id ? "bg-primary/10 hover:bg-primary/20" : ""}`}
          onClick={() => handleSelect(item.id)}
        >
          <RenderItem item={item} />
        </li>
      ))}
      {items.length > pageSize && (
        <li className="flex justify-center items-center rounded-md p-2">
          <button type="button" className="btn btn-primary">
            加载更多
          </button>
        </li>
      )}
    </ul>
  );
}

export default ScrollList;
