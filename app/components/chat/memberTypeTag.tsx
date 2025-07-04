const typeConfig = {
  1: { text: "主持人", color: "bg-red-100 text-red-800" },
  2: { text: "玩家", color: "bg-blue-100 text-blue-800" },
  3: { text: "观战", color: "bg-gray-100 text-gray-800" },
  4: { text: "骰娘", color: "bg-yellow-100 text-gray-800" },
};

/**
 *
 * @param memberType 对应Member里面的 memberType字段
 */
export function MemberTypeTag({ memberType }: {
  memberType?: number;
}) {
  // 类型安全转换
  const validType = memberType !== undefined && [1, 2, 3, 4].includes(memberType)
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
