import { PopWindow } from "@/components/common/popWindow";

export default function RepositoryPopWindow({
  modalOpen,
  setModalOpen,
  goToWorkSpace,
}: {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  goToWorkSpace: () => void;
}) {
  return (
    <PopWindow
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
    >
      <div className="flex justify-center flex-col items-center gap-10 w-80 p-6">
        <p className="text-lg font-medium">
          仓库创建成功，需要开始编辑吗？
        </p>
        <div className="join">
          <button
            className="w-24 btn btn-success join-item rounded-l-lg"
            type="button"
            onClick={goToWorkSpace}
          >
            去编辑
          </button>
          <button
            className="w-24 btn join-item rounded-r-lg"
            type="button"
            onClick={() => setModalOpen(false)}
          >
            取消
          </button>
        </div>
      </div>
    </PopWindow>
  );
}
