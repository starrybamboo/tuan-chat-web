import { useModuleDetailQuery } from "api/hooks/moduleQueryHooks";
import { useNavigate } from "react-router";

function ModuleCard({ id }: { id: number }) {
  // const image = [
  //   "https://imagebucket-1322308688.cos.ap-tokyo.myqcloud.com/picnia%2Fimage%2FIMG_4038.jpeg",
  //   "https://imagebucket-1322308688.cos.ap-tokyo.myqcloud.com/picnia%2Fimage%2FIMG_4031.jpeg",
  //   "https://imagebucket-1322308688.cos.ap-tokyo.myqcloud.com/picnia%2Fimage%2FIMG_3932.jpeg",
  // ];
  const navigate = useNavigate();
  const { data, isSuccess } = useModuleDetailQuery(id);
  const navigateToDetail = () => {
    navigate(`/module/detail/${id}`);
  };

  return (
    <div className="w-full h-full rounded-md overflow-hidden flex flex-col border-2 border-base-300 bg-base-100 shadow-md">
      {
        isSuccess
          ? (
              <>
                <div
                  className="w-full aspect-square text-2xl flex justify-center items-center border-b-1 border-base-300 dark:bg-base-200 bg-base-200/50 transition-all dark:hover:bg-base-200/50 hover:bg-base-200 hover:cursor-pointer"
                  onClick={navigateToDetail}
                >
                  {data?.data?.moduleName}
                </div>
                <div className="flex-grow p-4 overflow-hidden">
                  <p className="line-clamp-4 text-sm text-base-content/80 leading-relaxed">
                    {data?.data?.description || "暂无描述"}
                  </p>
                </div>
              </>
            )
          : undefined
      }
    </div>
  );
}

export default ModuleCard;
