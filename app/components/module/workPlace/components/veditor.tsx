import { useEffect, useState } from "react";
import Vditor from "vditor";
import "vditor/dist/index.css";

interface VeditorProps {
  id: string;
  placeholder?: string;
}

export function Veditor({
  id,
  placeholder,
}: VeditorProps) {
  const [_vditor, setVditor] = useState<Vditor | null>(null);

  useEffect(() => {
    const editor = id
      ? new Vditor(id, {
        after: () => {
          if (editor) {
            editor.setValue(placeholder || "");
            setVditor(editor);
          }
        },
        lang: "zh_CN",
        mode: "wysiwyg", // 默认实时模式
        icon: "ant",
      })
      : null;

    return () => {
      try {
        editor?.destroy();
      }
      catch (error) {
        console.error("Error destroying Vditor:", error);
      }
      setVditor(null);
    };
  }, [id, placeholder]);

  return (
    <div id={id} className="vditor" />
  );
}

export default Veditor;
