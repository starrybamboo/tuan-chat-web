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
}

function ScrollList<T extends { id: string | number }>({
  items,
  pageSize = 10,
  RenderItem,
  className = "",
}: ListProps<T>) {
  return (
    <ul className={`list w-full h-full bg-base-100 rounded-box ${className}`}>
      {items.map(item => (
        <li key={item.id} className="p-2 border-b border-base-300 last:border-none">
          <RenderItem item={item} />
        </li>
      ))}
      {items.length > pageSize && (
        <li className="flex justify-center items-center p-2">
          <button type="button" className="btn btn-primary">
            加载更多
          </button>
        </li>
      )}
    </ul>
  );
}

export default ScrollList;
