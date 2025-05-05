// import { useModuleDetailQuery } from "api/hooks/moduleQueryHooks";
// import { useParams } from "react-router";

function ModuleDetail() {
  // const { id } = useParams();
  // const { data, isSuccess } = useModuleDetailQuery(Number(id));

  return (
    <div className="min-h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] bg-base-100 overflow-x-hidden">
      <div className="mx-auto max-w-[1280px] px-4 py-[10px]">
        <div className="flex bg-base-100 ">
          {/* 图片部分 */}
          <div className="basis-30%">
            <img className="w-full h-full object-cover" src="https://imagebucket-1322308688.cos.ap-tokyo.myqcloud.com/picnia%2Fimage%2FIMG_4031.jpeg" />
          </div>
          {/* 信息以及操作部分 */}
          <div className="basis-70% flex flex-col gap-2">

          </div>
        </div>
      </div>
    </div>
  );
}

export default ModuleDetail;
