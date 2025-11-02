import CollectionList from "@/components/common/collection/collectionList";
import CollectionPreview from "@/components/common/collection/collectionPreview";
import CollectionSearchBar from "@/components/common/collection/collectionSearchBar";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { useCreateCollectionListMutation, useGetListCollectionsQuery } from "api/hooks/collectionQueryHooks";
import { useState } from "react";

function NewCollectionForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    collectionListName: "",
    description: "",
    isPublic: false,
    resourceListType: "1",
    coverImageUrl: "",
  });
  // const [file, setFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, files } = e.target; // e.target.name 和 state 对应
    setForm(prev => ({ ...prev, [name]: value }));
    // 文件类型的输入单独处理
    if (type === "file" && files && files.length > 0) {
      setForm(prev => ({ ...prev, [name]: files[0] }));
    }
    else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // const handleFile = (selectedFile: File) => {

  // };
  const createMutation = useCreateCollectionListMutation();
  const handleSubmit = () => {
    createMutation.mutate(form, {
      onSuccess: () => {
        onClose();
      },
      onError: (error) => {
        console.error("创建失败", error);
      },
    });
    onClose();
  };
  return (
    <div>
      <div className="text-center text-2xl font-bold">新建收藏夹</div>
      {/* <label className="btn btn-primary cursor-pointer">
        选择文件
        <input
          type="file"
          name="coverImageUrl"
          value={form.coverImageUrl}
          className="hidden"
          onChange={handleChange}
        />
      </label>
      <span className="max-w-64 block text-sm text-gray-500 truncate">
        {file ? file.name : "未选择文件"}
      </span> */}
      <ImgUploader setImg={() => {}}>
        <div className="text-base-content/60 hover:text-primary transition-colors p-1 rounded-full hover:bg-base-200 cursor-pointer">
          上传封面
        </div>
      </ImgUploader>
      <div className="text-lg font-medium">名称</div>
      <input className="border p-2 rounded focus:outline-none focus:ring-0" type="text" name="collectionListName" value={form.collectionListName} onChange={handleChange} />
      <div className="text-lg font-medium">描述</div>
      <input className="border p-2 rounded focus:outline-none focus:ring-0" type="text" name="description" value={form.description} onChange={handleChange} />
      <div className="p-2">
        <label>
          <input className="w-5 h-5 radio radio-primary" type="radio" name="isPublic" checked={form.isPublic === true} onChange={() => setForm(prev => ({ ...prev, isPublic: true }))} />
          公开
        </label>
        <label>
          <input className="w-5 h-5 radio radio-primary" type="radio" name="isPublic" checked={form.isPublic === false} onChange={() => setForm(prev => ({ ...prev, isPublic: false }))} />
          不公开
        </label>
      </div>
      <button className="block mx-auto px-4 py-2 btn btn-primary rounded w-40" type="button" onClick={handleSubmit}>提交</button>
    </div>
  );
};

export default function CollectionPage() {
  const [selectedListId, setSelectedListId] = useState(1); // 默认收藏夹 id

  const handleAddCollection = () => toastWindow(close => (<NewCollectionForm onClose={close} />));

  // 获取当前收藏夹内容
  const PAGE_SIZE = 20;
  const { data, isLoading, isError } = useGetListCollectionsQuery({
    pageSize: PAGE_SIZE,
    collectionListId: selectedListId,
  });
  const collections = data?.pages.flatMap(page => page?.data?.list) ?? [];

  // 添加收藏夹
  return (
    <div className="flex flex-col min-h-screen bg-base-200/70 dark:bg-base-200 p-4 lg:p-6 gap-6 font-sans">
      {/* 顶部搜索栏 */}
      <div className="fixed w-full z-10 top-16">
        <CollectionSearchBar />
      </div>

      {/* 主体区域 */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 mt-16">
        <div className="card lg:fixed flex flex-col w-full lg:w-1/4 bg-base-100 shadow-lg border border-gray-300 dark:border-black p-4">
          <CollectionList
            selectedId={selectedListId}
            onSelect={setSelectedListId}
            onAddCollection={handleAddCollection}
          />
        </div>

        {/* 右侧收藏内容 */}
        <div className="flex-1 flex-col lg:ml-[28%]">
          <ul className="flex gap-2">
            <li>全部</li>
            <li>帖子</li>
            <li>评论</li>
            <li>模组</li>
          </ul>
          {isLoading
            ? (
                <div className="flex justify-center items-center mt-20">
                  <span className="loading loading-spinner loading-lg "></span>
                  <div>加载中...</div>
                </div>
              )
            : isError
              ? (
                  "加载失败！"
                )
              : collections && collections.length === 0
                ? (
                    "空空如也"
                  )
                : (
                    <div className="grid grid-cols-3 auto-rows-[10px] gap-5">
                      {collections?.map(c => (
                        <CollectionPreview
                          key={c?.collectionId}
                          collectionId={c?.collectionId}
                          resourceId={c?.resourceId}
                          collectionTypeId={c?.resourceId}
                          collectTime={String(c?.createTime)}
                        />
                      ))}
                    </div>
                  )}
        </div>
      </div>
    </div>
  );
}
