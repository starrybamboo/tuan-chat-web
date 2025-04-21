import { useGetGroupInfoQuery } from "api/queryHooks";

function SettingWindow({ groupId }: { groupId: number }) {
  const getGroupInfo = useGetGroupInfoQuery(groupId);
  const group = getGroupInfo.data?.data;

  return (
    <div className="w-full p-4">
      {group && (
        <div>
          <img src={group.avatar} alt={group.name} className="w-32 h-32 mx-auto rounded-full" />
          <h2 className="text-2xl font-bold text-center my-4">{group.name}</h2>
          <p className="text-gray-600 text-center">{group.description}</p>
        </div>
      )}
    </div>
  );
}

export default SettingWindow;
