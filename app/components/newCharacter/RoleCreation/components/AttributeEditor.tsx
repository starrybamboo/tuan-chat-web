interface AttributeEditorProps {
  title: string;
  attributes: Record<string, number | string>;
  onChange: (key: string, value: number) => void;
}

export default function AttributeEditor({ title, attributes, onChange }: AttributeEditorProps) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h3 className="card-title text-lg flex items-center gap-2">
          ⚡
          {" "}
          {title}
        </h3>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {Object.entries(attributes).map(([key, value]) => (
            <div key={key} className="form-control">
              <label className="label">
                <span className="label-text">{key}</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={value}
                onChange={e => onChange(key, Number.parseInt(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
