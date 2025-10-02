// 活动通知组件
export default function ActivityNotice() {
  return (
    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
      <div className="flex items-center space-x-2">
        <span className="text-lg">🎁</span>
        <h3 className="font-bold">活动通知</h3>
      </div>
      <p className="text-sm opacity-90 mb-3">
        参与「动态页面」设计，赢取限量高额门槛优惠卷！
      </p>
      <button className="bg-pink-500 opacity-50 bg-opacity-20 px-4 py-1 text-pink-100 rounded-lg text-sm font-medium hover:bg-opacity-30 transition-colors" type="button">
        npm run dev 立即参与
      </button>
    </div>
  );
};
