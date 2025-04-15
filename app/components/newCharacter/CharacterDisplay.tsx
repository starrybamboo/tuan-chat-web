interface CharacterDisplayProps {
  avatar?: string;
  name: string;
  description: string;
}

export default function CharacterDisplay({ avatar, name, description }: CharacterDisplayProps) {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-start gap-4">
          {/* 头像展示 */}
          <div className="avatar">
            <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              {avatar
                ? (
                    <img
                      src={avatar}
                      alt={`${name}'s avatar`}
                      className="w-full h-full object-cover"
                    />
                  )
                : (
                    <div className="bg-neutral-content w-full h-full flex items-center justify-center">
                      <span className="text-neutral">无头像</span>
                    </div>
                  )}
            </div>
          </div>

          {/* 角色信息 */}
          <div className="flex-1">
            <h2 className="card-title text-xl mb-2">{name}</h2>
            <p className="text-base-content/70">{description}</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="card-actions justify-end mt-4">
          <button type="button" className="btn btn-ghost">编辑</button>
          <button type="button" className="btn btn-error btn-outline">删除</button>
        </div>
      </div>
    </div>
  );
}
