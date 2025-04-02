/* eslint-disable react-dom/no-missing-button-type */
export default function Head() {
  return (
    <div className="h-155 p-2">
      角色头像
      <div className="w-full text-center">
        <div className="m-auto w-30 h-30 bg-red-500">123</div>
        <input type="text" className="m-auto w-80 h-7 bg-[#161823] p-2 mt-3" />
        <button className="btn ml-2 bg-gray-400 inline-block h-7 rounded-none">更新标题</button>
      </div>
      <div className="w-full relative mt-5">
        {/* 选择和上传图像 */}
        <div className="w-6/10 border-1 float-left p-2">
          <div>选择一个头像 :</div>
          <button className="btn m-auto block">
            <b className="text-gray-400 ml-0">十</b>
            上传新头像
          </button>
          <p className="mt-2">当前角色id: 1</p>
          <p className="mt-2">当前头像id: 2</p>
          <p className="mt-2">可用头像数量: 13</p>
        </div>
        {/* 大图预览 */}
        <div className="w-4/10 bg-black h-20 float-left pl-3 pt-2">
          精灵图预览
        </div>
      </div>
    </div>
  );
}
