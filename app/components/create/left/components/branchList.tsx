import { PlusOutline } from "@/icons";

function CreateBranch() {
  return (
    <div className="h-8 flex text-sm items-center border-1 border-base-300 px-2 rounded-sm hover:bg-base-200 cursor-pointer">
      <PlusOutline />
      <span className="ml-2">新建分支</span>
    </div>
  );
}

function _BranchItem() {
  (
    <div>
      等待更新...
    </div>
  );
}

function BranchList() {
  return (
    <div>

    </div>
  );
}

export default function Branch() {
  return (
    <div className="w-full h-full flex flex-col">
      <CreateBranch />
      <div className="divider my-0! b-1" />
      <BranchList />
    </div>
  );
}
