import Pagination from "@/components/common/pagination";
import { useGlobalContext } from "@/components/globalContextProvider";
import { UserRoleCard } from "@/components/profile/cards/userRoleCard";
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
export function UserRolesList({
  userId,
  roleIds,
  totalRecords,
  currentPage,
  onPageChange,
  isLoading,
}: UserRolesListProps) {
  const currentUserId = useGlobalContext().userId ?? -1;
  const totalPages = Math.ceil(totalRecords / 10);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="animate-pulse w-48 bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="relative h-48 bg-gray-200">
              <div className="w-full h-full bg-gray-200"></div>
            </div>
            <div className="p-4 space-y-2">
              <div className="bg-gray-200 h-4 rounded-full w-4/5"></div>
              <div className="bg-gray-200 h-3 rounded-full w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (roleIds.length === 0) {
    return (
      <div className="text-center py-10 rounded-lg">
        {currentUserId === userId
          ? (
              <div className="w-full flex flex-col items-center justify-center text-gray-500 gap-2 mt-8">
                <Link
                  to="/role"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-pink-100 text-pink-500 hover:bg-pink-200 transition-colors duration-200"
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
                <p className="text-center leading-snug text-sm mt-2">
                  还没有角色呢…
                  <br />
                  可以从一个小小的名字开始喵~
                </p>
              </div>
            )
          : (
              <p className="text-gray-500">这里还没有他的角色...仿佛藏着一段被尘封的往事...</p>
            )}
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
          className="mt-8 items-center w-full"
        />
      )}
    </>
  );
}
