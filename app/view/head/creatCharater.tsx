import Head from "./head";
// 定义 CreatCharater 的 props 类型

export default function CreatCharater() {
  return (
    <div className="h-full overflow-y-scroll">
      {/* 编辑角色 */}
      <div className="h-10 border-b-1 border-black p-2">编辑角色</div>
      {/* 输入角色名称 */}
      <div className="border-b-1 border-black p-2">
        角色名称
        <br />
        <input type="text" className="w-full h-7 bg-[#161823] p-2 rounded-xl" name="name" />
      </div>
      {/* 输入角色描述 */}
      <div className="border-b-1 border-black p-2">
        角色描述
        <br />
        <textarea name="description" className="bg-[#161823] w-full rounded-xl p-2 h-24 resize-none"></textarea>
      </div>
      <Head></Head>
    </div>
  );
}
