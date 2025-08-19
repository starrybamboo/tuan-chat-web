import { useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import { useEffect, useRef } from "react";
import Vditor from "vditor";
import { useModuleContext } from "../context/_moduleContext";
import "vditor/dist/index.css";

interface VeditorProps {
  id: string;
  placeholder?: string;
  onMentionClick?: (type: "物品" | "角色" | "地点", name: string) => void;
}

export function Veditor({ id, placeholder, onMentionClick }: VeditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Vditor | null>(null);
  const { stageId } = useModuleContext();
  const entities = useQueryEntitiesQuery(stageId as number).data?.data?.filter(entity => [1, 2, 4].includes(entity.entityType!));

  // 处理点击事件
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const mention = target.closest("[data-type]") as HTMLElement;
      if (mention && onMentionClick) {
        const type = mention.getAttribute("data-type");
        const name = mention.getAttribute("data-name");
        if (type && name && ["物品", "角色", "地点"].includes(type)) {
          onMentionClick(type as "物品" | "角色" | "地点", name);
        }
      }
    };

    if (editorContainerRef.current) {
      const editor = new Vditor(editorContainerRef.current, {
        cache: { enable: false },
        after: () => {
          editorRef.current = editor;
          // 设置占位符
          if (placeholder) {
            editor.setValue(placeholder);
          }

          // 添加点击事件监听
          editor.vditor.wysiwyg?.element?.addEventListener("click", handler);
        },
        lang: "zh_CN",
        mode: "wysiwyg",
        icon: "ant",
        toolbar: [
          "emoji",
          "headings",
          "bold",
          "italic",
          "strike",
          "link",
          "|",
          "list",
          "ordered-list",
          "check",
          "outdent",
          "indent",
          "|",
          "quote",
          "line",
          "code",
          "inline-code",
          "insert-before",
          "insert-after",
          "|",
          "table",
          "|",
        ],
        hint: {
          extend: [
            {
              key: "@物品/",
              hint: () => {
                const items = entities!.filter(entity => entity.entityType === 1);
                return Promise.resolve(
                  items.map(item => ({
                    value: `@物品/${item.name}`,
                    html: item.name || "",
                    insert: `@物品/${item.name}`,
                  })).filter(item => item.html),
                );
              },
            },
            {
              key: "@角色/",
              hint: () => {
                const roles = entities!.filter(entity => entity.entityType === 2);
                return Promise.resolve(
                  roles.map(role => ({
                    value: `@角色/${role.name}`,
                    html: role.name || "",
                    insert: `@角色/${role.name}`,
                  })).filter(role => role.html),
                );
              },
            },
            {
              key: "@地点/",
              hint: () => {
                const locations = entities!.filter(entity => entity.entityType === 4);
                return Promise.resolve(
                  locations.map(location => ({
                    value: `@地点/${location.name}`,
                    html: location.name || "",
                    insert: `@地点/${location.name}`,
                  })).filter(location => location.html),
                );
              },
            },
            {
              key: "@",
              hint: () =>
                Promise.resolve([
                  { value: "@物品/", html: "物品" },
                  { value: "@角色/", html: "角色" },
                  { value: "@地点/", html: "地点" },
                ]),
            },
          ],
        },
      });

      return () => {
        // 清理事件监听器和销毁编辑器
        if (editorRef.current && editorRef.current.vditor) {
          editorRef.current.vditor.wysiwyg?.element?.removeEventListener("click", handler);
          try {
            editorRef.current.destroy();
          }
          catch { }
        }
        editorRef.current = null;
      };
    }
  }, [id, placeholder, onMentionClick, entities]);

  return <div id={id} className="vditor" ref={editorContainerRef} />;
}

export default Veditor;
