import { useDissolveGroupMutation, useGetGroupInfoQuery } from "api/queryHooks";

function SettingWindow({ groupId, onClose }: { groupId: number; onClose: () => void }) {
  // 获取群组数据
  const getGroupInfoQuery = useGetGroupInfoQuery(groupId);
  const group = getGroupInfoQuery.data?.data;
  // 解散群组
  const dissolveGroupMutation = useDissolveGroupMutation(groupId);
  return (
    <div className="w-full p-4">
      {group && (
        <div>
          <div className="flex justify-center">
            <button
              type="button"
              className="focus:outline-none"
            >
              <img
                src={group.avatar}
                alt={group.name}
                className="w-24 h-24 mx-auto rounded-lg"
              />
            </button>
          </div>
          <h2 className="text-2xl font-bold text-center my-4">{group.name}</h2>
          <p className="text-gray-600 text-center">{group.description}</p>
          <div className="flex justify-end mt-16">
            <button
              type="button"
              className="btn btn-error"
              onClick={() => dissolveGroupMutation.mutate({ roomId: groupId }, {
                onSuccess: () => {
                  onClose();
                },
              })}
            >
              解散群组
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingWindow;
