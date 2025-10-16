import { Filter, Search } from "@/icons";
import { useState } from "react";

export default function CollectionSearchBar() {
  const [showFilters, setShowFilters] = useState(false);
  return (
    <div className="flex w-full justify-start md:justify-center lg:justify-center items-center px-4 md:px-0 lg:px-0">
      {/* 按类型筛选 */}
      <div className="relative" onMouseEnter={() => setShowFilters(true)} onMouseLeave={() => setShowFilters(false)}>
        <button type="button" className="cursor-pointer mr-4"><Filter className="h-6 w-6" /></button>
        {showFilters && (
          <div className="absolute flex flex-col bg-base-100 rounded-lg shadow-2xl min-w-[120px] z-10 p-2 space-y-1">
            {["帖子", "评论", "模组"].map(label => (
              <label
                key={label}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>

        )}
      </div>
      <div className="flex flex-grow max-w-md border-2 border-gray-300 rounded-lg bg-gray-50 dark:bg-black h-10">
        <input
          type="text"
          className="w-full bg-transparent focus:outline-none text-sm p-2 pl-4"
        />
        <button type="button" className="cursor-pointer flex items-center justify-center rounded-full p-2 m-1 shrink-0">
          <Search />
        </button>
      </div>
    </div>
  );
}
