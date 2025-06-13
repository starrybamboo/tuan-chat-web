import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";
import EditProfileWindow from "@/components/profile/editProfileWindow";
import { useGetUerSCBalanceQuery } from "../../../api/hooks/scQueryHooks";

function ProfilePage() {
  // 当前登录用户的userId
  const userId = useGlobalContext().userId ?? -1;

  const getUserSCBalanceQuery = useGetUerSCBalanceQuery(userId);

  const [isEditWindowOpen, setIsEditWindowOpen] = useSearchParamsState<boolean>(`profileEditPop`, false);

  return (
    <div className="card bg-base-100 w-[max(30vw,300px)] mx-auto gap-8">
      <UserDetail userId={userId}></UserDetail>
      <button className="btn btn-info w-max mx-auto" type="button" onClick={() => setIsEditWindowOpen(true)}>修改资料</button>
      <div className="card-body">
        <div className="card-title">
          <span>SC余额</span>
        </div>
        <div className="card-actions justify-end">
          <div className="badge badge-outline">{getUserSCBalanceQuery.data?.data?.balance}</div>
        </div>
      </div>
      <PopWindow isOpen={isEditWindowOpen} onClose={() => setIsEditWindowOpen(false)}>
        <EditProfileWindow onClose={() => setIsEditWindowOpen(false)}></EditProfileWindow>
      </PopWindow>
    </div>
  );
}

export default ProfilePage;
