interface AttributeEditorProps {
  title: string;
  attributes: Record<string, number | string>;
  onChange: (key: string, value: number) => void;
}

export default function AttributeEditor({ title, attributes, onChange }: AttributeEditorProps) {
  return (
    <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
      <div className="card-body">
        <h3 className="card-title text-lg flex items-center gap-2">
          ⚡
          {title}
        </h3>

        {title === "角色表演能力"
          ? (
              <div className="grid grid-cols-2 gap-6 mt-4">
                {Object.entries(attributes as Record<string, string>).map(([key, value]) => (
                  <div key={key} className="form-control w-full">

                    <span className="font-semibold text-base label-text ml-1.5">{key}</span>

                    <textarea
                      className="textarea textarea-bordered bg-base-200 rounded-md w-full min-h-32 mt-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border-none outline-none"
                      placeholder="请输入表演描述..."
                      value={(value as any) === 0 || value === "0" ? "" : String(value ?? "")}
                      onChange={e => (onChange as (k: string, v: string | number) => void)(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )
          : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {Object.entries(attributes as Record<string, number>).map(([key, value]) => (
                  <div key={key} className="form-control">
                    <div className="flex items-center gap-1 group">
                      <div className="w-full">
                        <label className="input flex items-center gap-1 md:gap-2 w-full rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none">
                          <span className="text-xs md:text-sm">{key}</span>
                          <div className="w-px h-4 bg-base-content/20"></div>
                          <input
                            type="number"
                            value={value}
                            className="grow focus:outline-none border-none outline-none"
                            onChange={e => (onChange as (k: string, v: number) => void)(key, Number.parseInt(e.target.value) || 0)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>
    </div>
  );
}
