import React from "react";

// 定义物品信息的类型接口
interface EntityInfo {
  description: string;
  tip: string;
  image: string;
}

interface ItemDetailProps {
  entityInfo: EntityInfo;
  name: string;
}

const ItemDetail: React.FC<ItemDetailProps> = ({ entityInfo, name }) => {
  const { description, tip, image } = entityInfo;

  return (
    <div className="max-w-md w-full bg-neutral-50 dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
      {/* 头部区域 - 包含头像和名称 */}
      <div className="p-5 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-4">
          {/* 物品头像 */}
          <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
            {image
              ? (
                  <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover transition-transform hover:scale-110 duration-300"
                  />
                )
              : (
                  <span className="text-neutral-400 dark:text-neutral-300 text-sm text-center px-2">
                    该物品没有图片
                  </span>
                )}
          </div>

          {/* 物品名称 */}
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{name}</h2>
        </div>
      </div>

      {/* 内容区域 - 包含描述和提示 */}
      <div className="p-5 space-y-6">
        {/* 描述部分 */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">描述</h3>
          <p className="text-neutral-700 dark:text-neutral-200 whitespace-pre-line leading-relaxed">
            {description}
          </p>
        </div>

        {/* 提示部分 */}
        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
          <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-200 mb-2 uppercase tracking-wider">提示</h3>
          <p className="text-blue-800 dark:text-blue-100 whitespace-pre-line leading-relaxed">
            {tip}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
