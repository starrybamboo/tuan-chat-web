import React from "react";

interface ScCurrencyDisplayProps {
  balance?: number;
}

/**
 * SC 货币余额展示组件
 * @param balance - 用户的余额
 */
const ScCurrencyDisplay: React.FC<ScCurrencyDisplayProps> = ({
  balance = 0, // 默认值为 0
}) => {
  return (
    <div className="mt-8 rounded-xl p-5 shadow-lg opacity-90 relative overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-gray-800 dark:to-gray-900 transition-colors">
      {/* 装饰性背景元素 */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-indigo-500/20"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-300/10 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>

      <div className="relative z-10 flex justify-between items-center">
        <div>
          <p className="text-purple-200 text-sm">游戏货币余额</p>
          <h3 className="text-2xl font-bold text-white mt-1">SC 点数</h3>
        </div>
        <div className="flex items-baseline">
          <span className="text-4xl md:text-5xl font-bold text-white">{balance}</span>
          <span className="text-xl text-purple-200 ml-2">SC</span>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex space-x-3">
        <button
          type="button"
          className="flex-1 bg-white text-indigo-600 font-medium py-2 px-4 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          充值
        </button>
        <button
          type="button"
          className="flex-1 bg-indigo-800 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          兑换
        </button>
      </div>
    </div>
  );
};

export default ScCurrencyDisplay;
