// 空状态组件
export default function CreateEntry({
  AICreate,
  createBySelf,
  STCreate,
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
      <div>
        <h1 className="text-3xl font-bold text-base-content mb-2">创建新角色</h1>
        <p className="text-sm text-base-content/70 mb-8">选择一种方式开始创建你的角色</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mx-auto max-w-3xl">
          {/* AI卡 */}
          <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-200 hover:shadow-lg transition-all duration-200 h-auto md:h-100 cursor-pointer transform hover:scale-105" onClick={AICreate}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-base-content mb-2 text-center">AI一键车卡</h3>
            <p className="text-sm text-base-content/70 text-center leading-relaxed">
              使用AI智能生成角色属性和背景故事，快速创建丰富的角色设定
            </p>
          </div>

          {/* ST指令导入 */}
          <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-200 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105" onClick={STCreate}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-base-content mb-2 text-center">ST指令导入</h3>
            <p className="text-sm text-base-content/70 text-center leading-relaxed">
              通过.st指令快速导入角色属性，适合已有角色数据的用户
            </p>
          </div>

          {/* 从0开始创建 */}
          <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-200 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105" onClick={createBySelf}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-base-content mb-2 text-center">逐步自主创建</h3>
            <p className="text-sm text-base-content/70 text-center leading-relaxed">
              手动填写所有角色信息，完全自定义角色的每一个细节
            </p>
          </div>
        </div>

        <p className="mt-10 text-xs text-base-content/70 text-center">
          选择最适合你的创建方式，开始构建独特的角色世界
        </p>
      </div>
    </div>
  );
}
