import type { UserInfoResponse } from "../../../api";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetUserInfoQuery, useUpdateUserInfoMutation } from "../../../api/queryHooks";
import { ImgUploaderWithCopper } from "../common/uploader/imgUploaderWithCopper";

function ProfilePage() {
  // 当前登录用户的userId
  const userId = useGlobalContext().userId ?? -1;

  const userQuery = useGetUserInfoQuery(userId);

  const user = userQuery.data?.data;

  const updateUserInfoMutation = useUpdateUserInfoMutation();

  return (
    <div className="card bg-base-100 shadow-xl min-w-[20vw] max-w-[30vw] mx-auto top-1/4">
      <div className="card-body">
        {/* 头像部分 */}
        <div className="flex flex-col items-center gap-4">
          <ImgUploaderWithCopper
            setCopperedDownloadUrl={(url) => {
              updateUserInfoMutation.mutate({ ...user, avatar: url } as UserInfoResponse);
            }}
            fileName={`userId-${user?.userId}`}
          >
            <div className="relative group overflow-hidden rounded-full ring ring-offset-base-100 ring-offset-2">
              <img
                src={user?.avatar || undefined}
                alt={user?.username}
                className="w-24 h-24 mx-auto rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
              />
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm"
              >
                <span className="font-medium px-2 py-1 rounded">
                  更新头像
                </span>
              </div>
            </div>
          </ImgUploaderWithCopper>
          <h2 className="card-title text-2xl">
            {user?.username || "未知用户"}
          </h2>

          {/* 详细信息 */}
          <div className="divider"></div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-base-content/70">用户ID</span>
              <span className="font-mono">{userId}</span>
            </div>

            {user?.lastLoginTime && (
              <div className="flex justify-between">
                <span className="text-base-content/70">最后登录</span>
                <span>
                  {user.lastLoginTime}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
