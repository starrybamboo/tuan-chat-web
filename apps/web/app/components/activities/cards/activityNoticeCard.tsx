// 活动通知组件
export default function ActivityNotice() {
  return (
    <div className="
      rounded-xl border border-warning/30 bg-warning/10 p-4 text-base-content
    ">
      <div className="flex items-center space-x-2">
        <span className="text-lg">🎁</span>
        <h3 className="font-bold">活动通知</h3>
      </div>
      <p className="text-sm opacity-90 mb-3">
        参与「动态页面」设计，赢取限量高额门槛优惠卷！
      </p>
      <button className="
        rounded-lg bg-warning px-4 py-1 text-warning-content
        text-sm font-medium
        hover:bg-warning/90
        transition-colors
      " type="button">
        pnpm dev 立即参与
      </button>
    </div>
  );
};
