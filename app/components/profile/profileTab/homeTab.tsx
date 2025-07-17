import { useGlobalContext } from "@/components/globalContextProvider";
import React from "react";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

interface HomeTabProps {
  userId: number;
}

export const HomeTab: React.FC<HomeTabProps> = ({ userId }) => {
  const userQuery = useGetUserInfoQuery(userId);
  useGlobalContext();
  const user = userQuery.data?.data;

  return (
    <div className="bg-gray-100 max-w-7xl mx-auto p-4 flex">
      <div className="w-full max-w-1/4 flex flex-col md:flex-row py-8">
        <div className="flex flex-col items-center rounded-2xl p-6">
          {/* 头像 */}
          <div className="md:48 lg:w-54 mb-4">
            {userQuery?.isLoading
              ? (
                  <div className="skeleton w-full h-full rounded-full"></div>
                )
              : (
                  <div className="pointer-events-none w-full h-full">
                    <img
                      src={user?.avatar || undefined}
                      alt={user?.username}
                      className="mask mask-circle w-full h-full object-cover"
                    />
                  </div>
                )}
          </div>

          {/* 用户名 */}
          <div className="flex items-center">
            {userQuery.isLoading
              ? (
                  <div className="skeleton h-8 w-48 pr-4"></div>
                )
              : (
                  <h2 className="text-2xl font-bold h-8  transition-all duration-300
               overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {user?.username || "未知用户"}
                  </h2>
                )}
          </div>
          <p className="text-gray-500 text-sm mb-2">@github</p>

          {/* 简介 */}
          <p className="text-center text-sm text-gray-700 dark:text-gray-300 mt-2">
            GitHub mascot and software enthusiast.
          </p>

          {/* 信息列表 */}
          <div className="mt-4 space-y-2 text-sm w-full text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4" />
              <span>San Francisco</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4" />
              <span>GitHub</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4" />
              <a
                href="https://github.blog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                github.blog
              </a>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4" />
              <span>
                <strong>300</strong>
                {" "}
                followers
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-md p-4">
        new
      </div>
    </div>
  );
};

export default HomeTab;
