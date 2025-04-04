const typeConfig = {
  1: { text: "群主", color: "bg-red-100 text-red-800" },
  2: { text: "管理员", color: "bg-blue-100 text-blue-800" },
  3: { text: "成员", color: "bg-gray-100 text-gray-800" },
};

// 怒了, 怎么memberType也可以是undefined
export function MemberTypeTag({ memberType }: {
  memberType?: number; // 允许undefined类型
}) {
  // 类型安全转换
  const validType = memberType !== undefined && [1, 2, 3].includes(memberType)
    ? memberType as keyof typeof typeConfig
    : null;

  if (!validType)
    return <div>未知类型</div>;

  return (
    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${typeConfig[validType].color}`}>
      {typeConfig[validType].text}
    </span>

  );
}
