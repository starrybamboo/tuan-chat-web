// 空状态组件
export default function CreateEntry({
  animationTrigger,
}: {
  AICreate: () => void;
  createBySelf: () => void;
  STCreate: () => void;
  animationTrigger?: number; // 动画触发器，每次变化时重新触发动画
}) {
  return (
    <div
      key={animationTrigger || 0} // 使用key来强制重新渲染，触发CSS动画
      className="animate-scale-in flex flex-col items-center justify-center h-full min-h-[calc(100vh-6rem)] p-6"
    >
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-base-content mb-3">角色管理</h1>
        <p className="text-lg text-base-content/70 mb-2">从左侧侧边栏选择或创建一个角色</p>
        <p className="text-sm text-base-content/50">点击"创建普通角色"或"创建骰娘"开始你的创建之旅</p>
        <p className="mt-8 text-xs text-base-content/50 text-center">
          提示：也可以从现有角色页面点击"转换为骰娘"快速创建骰娘角色
        </p>
      </div>
    </div>
  );
}
