import Pagination from "@/components/common/pagination";
import { useGlobalContext } from "@/components/globalContextProvider";
import UserRoleCard from "@/components/profile/cards/userRoleCard";
import React from "react";
import { Link } from "react-router";

interface UserRolesListProps {
  userId: number;
  roleIds: number[];
  totalRecords: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

/**
 * 在workTab使用的角色列表，卡片本身来源于userRoleCard
 */
export const RolesList: React.FC<UserRolesListProps> = ({
  userId,
  roleIds,
  totalRecords,
  currentPage,
  onPageChange,
  isLoading,
}) => {
  const currentUserId = useGlobalContext().userId ?? -1;
  const totalPages = Math.ceil(totalRecords / 10);

  if (isLoading) {
    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="card bg-base-100 shadow-md animate-pulse w-full"
            >
              <div className="relative aspect-square bg-base-200 rounded-t-2xl">
                <div className="w-full h-full bg-base-300 rounded-t-2xl"></div>
              </div>
              <div className="card-body p-4 space-y-2">
                <div className="bg-base-300 h-4 rounded-full w-4/5"></div>
                <div className="bg-base-300 h-3 rounded-full w-full"></div>
                <div className="bg-base-300 h-3 rounded-full w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="bg-base-300 h-10 rounded-lg w-64 animate-pulse"></div>
          </div>
        )}
      </>
    );
  }

  if (roleIds.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center py-10 rounded-lg">
          {currentUserId === userId
            ? (
                <div className="w-full flex flex-col items-center justify-center gap-4">
                  <Link
                    to="/role"
                    className="btn btn-circle btn-lg bg-primary/10 text-primary hover:bg-primary/20 border-none"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </Link>
                  <div className="text-base-content/70 text-sm leading-relaxed max-w-xs">
                    <p>还没有角色呢…</p>
                    <p>可以从一个小小的名字开始喵~</p>
                  </div>
                </div>
              )
            : (
                <div className="text-base-content/70 text-sm max-w-sm mx-auto leading-relaxed">
                  <p>这里还没有他的角色...</p>
                  <p>仿佛藏着一段被尘封的往事...</p>
                </div>
              )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* 每一个角色放在小卡片中渲染 */}
        {roleIds.map(roleId => (
          <UserRoleCard key={roleId} roleId={roleId} />
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={onPageChange}
          className="mt-8 flex justify-center w-full"
        />
      )}
    </>
  );
};

export default RolesList;
