// 活动通知组件
export default function ActivityNotice() {
  return (
    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white mb-6">
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-lg">🎁</span>
        <h3 className="font-bold">活动通知</h3>
      </div>
      <p className="text-sm opacity-90 mb-3">
        参与「南梁」话题讨论，赢取限量周边礼品！
      </p>
      <button className="bg-blue-600 opacity-50 bg-opacity-20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-30 transition-colors" type="button">
        立即参与
      </button>
    </div>
  );
};
