import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";

function ProfilePage() {
  // 当前登录用户的userId
  const userId = useGlobalContext().userId ?? -1;

  return (
    <div>
      <UserDetail userId={userId}></UserDetail>
    </div>
  );
}

export default ProfilePage;
