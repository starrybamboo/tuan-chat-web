export default function CharacterEditing() {
  return (
    <div className="container mx-auto p-4">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-6">创建新角色</h2>

          {/* 头像上传区域 */}
          <div className="form-control w-full max-w-xs mb-6">
            <label className="label">
              <span className="label-text">角色头像</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="avatar">
                <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  <div className="bg-neutral-content w-full h-full flex items-center justify-center">
                    <span className="text-neutral">未选择图片</span>
                  </div>

                </div>
              </div>
              <input
                type="file"
                className="file-input file-input-bordered w-full max-w-xs"
              />
            </div>
          </div>

          {/* 角色名称输入 */}
          <div className="form-control w-full max-w-xs mb-6">
            <label className="label">
              <span className="label-text">角色名称</span>
            </label>
            <input
              type="text"
              placeholder="输入角色名称"
              className="input input-bordered w-full"
            />
          </div>

          {/* 角色简介输入 */}
          <div className="form-control w-full mb-6">
            <label className="label">
              <span className="label-text">角色简介</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder="输入角色简介"
            >
            </textarea>
          </div>

          {/* 提交按钮 */}
          <div className="card-actions justify-end">
            <button type="submit" className="btn btn-primary">创建角色</button>
          </div>
        </div>
      </div>
    </div>
  );
}
