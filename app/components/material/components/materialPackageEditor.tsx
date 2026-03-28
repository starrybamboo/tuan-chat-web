import type { MaterialMessageItem } from "../../../../api/models/MaterialMessageItem";
import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";
import {
  DotsSixVerticalIcon,
  FileIcon,
  ImageIcon,
  MusicNotesIcon,
  PackageIcon,
  PlusIcon,
  SquaresFourIcon,
  TrashIcon,
  VideoCameraIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { UploadUtils } from "@/utils/UploadUtils";
import { MaterialNode } from "../../../../api/models/MaterialNode";
import { MessageType } from "../../../../api/wsModels";
import MaterialPackageAssetUploadMenu from "./materialPackageAssetUploadMenu";
import { createEmptyMaterialPackageContent } from "./materialPackageEditorShared";

export interface MaterialPackageDraft {
  name: string;
  description: string;
  coverUrl: string;
  isPublic: boolean;
  content: MaterialPackageContent;
}

interface MaterialPackageEditorProps {
  valueKey: string;
  title: string;
  subtitle?: string;
  initialDraft: MaterialPackageDraft;
  readOnly?: boolean;
  showPublicToggle?: boolean;
  saveLabel?: string;
  deleteLabel?: string;
  savePending?: boolean;
  deletePending?: boolean;
  onSave?: (draft: MaterialPackageDraft) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

interface MaterialSection {
  key: string;
  title: string;
  sectionType: "root" | "folder";
  rootIndex: number;
  materials: Array<{
    childIndex: number;
    node: MaterialNode;
  }>;
  hiddenFolderCount: number;
}

interface MessagePresentation {
  icon: typeof ImageIcon;
  label: string;
  fileName: string;
  url?: string;
  badges: string[];
  metaText: string;
}

const CHINESE_NUMERAL_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function toChineseNumeral(value: number): string {
  if (value <= 0) {
    return CHINESE_NUMERAL_DIGITS[0];
  }

  if (value < 10) {
    return CHINESE_NUMERAL_DIGITS[value] ?? String(value);
  }

  if (value < 20) {
    return `十${value === 10 ? "" : CHINESE_NUMERAL_DIGITS[value % 10]}`;
  }

  if (value < 100) {
    const tens = Math.floor(value / 10);
    const units = value % 10;
    return `${CHINESE_NUMERAL_DIGITS[tens]}十${units === 0 ? "" : CHINESE_NUMERAL_DIGITS[units]}`;
  }

  return String(value);
}

function createChapterTitle(index: number): string {
  return `第${toChineseNumeral(index)}幕`;
}

function cloneContent(content?: MaterialPackageContent): MaterialPackageContent {
  return JSON.parse(JSON.stringify(content ?? createEmptyMaterialPackageContent())) as MaterialPackageContent;
}

function createMaterialNode(name = ""): MaterialNode {
  return {
    type: MaterialNode.type.MATERIAL,
    name,
    note: "",
    messages: [],
  };
}

function createDefaultSectionNode(name = "第一幕"): MaterialNode {
  return {
    type: MaterialNode.type.FOLDER,
    name,
    children: [],
  };
}

function ensureEditableContent(content: MaterialPackageContent | undefined, readOnly: boolean): MaterialPackageContent {
  const next = cloneContent(content);
  next.version = next.version ?? 1;
  next.root = Array.isArray(next.root) ? next.root : [];

  if (!readOnly) {
    const rootNodes = next.root;
    const folderNodes = rootNodes.filter(node => node.type === MaterialNode.type.FOLDER);
    const looseMaterials = rootNodes.filter(node => node.type === MaterialNode.type.MATERIAL);

    if (rootNodes.length === 0) {
      next.root = [createDefaultSectionNode()];
      return next;
    }

    if (looseMaterials.length > 0) {
      next.root = [
        createDefaultSectionNode(createChapterTitle(1)),
        ...folderNodes,
      ];

      const firstSection = next.root[0];
      firstSection.children = looseMaterials;
    }
    else {
      next.root = folderNodes.map((node, index) => ({
        ...node,
        name: node.name?.trim() || createChapterTitle(index + 1),
        children: Array.isArray(node.children) ? node.children : [],
      }));
    }
  }

  return next;
}

function normalizeDraft(draft: MaterialPackageDraft, readOnly: boolean): MaterialPackageDraft {
  return {
    name: draft.name ?? "",
    description: draft.description ?? "",
    coverUrl: draft.coverUrl ?? "",
    isPublic: draft.isPublic ?? true,
    content: ensureEditableContent(draft.content, readOnly),
  };
}

function getDirectMaterials(nodes: MaterialNode[] | undefined) {
  const materials: Array<{ childIndex: number; node: MaterialNode }> = [];
  let hiddenFolderCount = 0;

  (nodes ?? []).forEach((node, childIndex) => {
    if (node.type === "material") {
      materials.push({ childIndex, node });
      return;
    }

    if (node.type === "folder") {
      hiddenFolderCount += 1;
    }
  });

  return { materials, hiddenFolderCount };
}

function buildSections(content: MaterialPackageContent): MaterialSection[] {
  const rootNodes = Array.isArray(content.root) ? content.root : [];
  const sections: MaterialSection[] = [];
  const looseMaterials: Array<{ childIndex: number; node: MaterialNode }> = [];

  rootNodes.forEach((node, rootIndex) => {
    if (node.type === "folder") {
      const { materials, hiddenFolderCount } = getDirectMaterials(node.children);
      sections.push({
        key: `folder-${rootIndex}`,
        title: node.name?.trim() || `分组 ${sections.length + 1}`,
        sectionType: "folder",
        rootIndex,
        materials,
        hiddenFolderCount,
      });
      return;
    }

    if (node.type === "material") {
      looseMaterials.push({ childIndex: rootIndex, node });
    }
  });

  if (looseMaterials.length > 0 || sections.length === 0) {
    sections.unshift({
      key: "root",
      title: sections.length === 0 ? "第一幕" : "未分组",
      sectionType: "root",
      rootIndex: -1,
      materials: looseMaterials,
      hiddenFolderCount: 0,
    });
  }

  return sections;
}

function getNestedPayload(message: MaterialMessageItem, key: "imageMessage" | "soundMessage" | "videoMessage" | "fileMessage") {
  const extra = (message.extra ?? {}) as Record<string, any>;
  return extra[key] ?? extra;
}

function formatFileSize(size?: number) {
  if (!size || size <= 0) {
    return "";
  }

  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${size} B`;
}

function getMessagePresentation(message: MaterialMessageItem): MessagePresentation {
  const annotations = Array.isArray(message.annotations)
    ? message.annotations.filter(Boolean)
    : [];

  if (message.messageType === MessageType.IMG) {
    const image = getNestedPayload(message, "imageMessage");
    return {
      icon: ImageIcon,
      label: "图片",
      fileName: image?.fileName || "图片素材",
      url: image?.url,
      badges: ["Background", ...annotations],
      metaText: [image?.width && image?.height ? `${image.width} x ${image.height}` : "", formatFileSize(image?.size)].filter(Boolean).join(" · "),
    };
  }

  if (message.messageType === MessageType.SOUND) {
    const sound = getNestedPayload(message, "soundMessage");
    return {
      icon: MusicNotesIcon,
      label: "音频",
      fileName: sound?.fileName || "音频素材",
      url: sound?.url,
      badges: [sound?.purpose?.toUpperCase?.() || "BGM", ...annotations],
      metaText: [typeof sound?.second === "number" ? `${sound.second}s` : "", formatFileSize(sound?.size)].filter(Boolean).join(" · "),
    };
  }

  if (message.messageType === MessageType.VIDEO) {
    const video = getNestedPayload(message, "videoMessage");
    return {
      icon: VideoCameraIcon,
      label: "视频",
      fileName: video?.fileName || "视频素材",
      url: video?.url,
      badges: ["Video", ...annotations],
      metaText: [typeof video?.second === "number" ? `${video.second}s` : "", formatFileSize(video?.size)].filter(Boolean).join(" · "),
    };
  }

  const file = getNestedPayload(message, "fileMessage");
  return {
    icon: FileIcon,
    label: "文件",
    fileName: file?.fileName || "文件素材",
    url: file?.url,
    badges: ["File", ...annotations],
    metaText: formatFileSize(file?.size),
  };
}

function AssetCard({
  message,
  readOnly,
  onRemove,
}: {
  message: MaterialMessageItem;
  readOnly: boolean;
  onRemove: () => void;
}) {
  const presentation = getMessagePresentation(message);
  const Icon = presentation.icon;

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-base-content">{presentation.fileName}</div>
              <div className="text-xs text-base-content/55">{presentation.label}</div>
            </div>
          </div>

          {(presentation.badges.length > 0 || presentation.metaText) && (
            <div className="flex flex-wrap gap-2">
              {presentation.badges.map(badge => (
                <span
                  key={`${presentation.fileName}-${badge}`}
                  className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] text-primary"
                >
                  {badge}
                </span>
              ))}
              {presentation.metaText && (
                <span className="rounded-full border border-base-300 bg-base-200/70 px-2 py-1 text-[11px] text-base-content/65">
                  {presentation.metaText}
                </span>
              )}
            </div>
          )}
        </div>

        {!readOnly && (
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full border border-base-300 bg-base-200/70 text-base-content/65 transition hover:border-error/30 hover:bg-error/10 hover:text-error"
            onClick={onRemove}
            aria-label="移除素材条目"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function MaterialPackageEditor({
  valueKey,
  title,
  subtitle,
  initialDraft,
  readOnly = false,
  showPublicToggle = false,
  saveLabel = "保存",
  deleteLabel = "删除",
  savePending = false,
  deletePending = false,
  onSave,
  onDelete,
}: MaterialPackageEditorProps) {
  const uploadUtilsRef = useRef(new UploadUtils());
  const normalizedInitialDraft = normalizeDraft(initialDraft, readOnly);
  const [name, setName] = useState(normalizedInitialDraft.name);
  const [description, setDescription] = useState(normalizedInitialDraft.description);
  const [coverUrl, setCoverUrl] = useState(normalizedInitialDraft.coverUrl);
  const [isPublic, setIsPublic] = useState(normalizedInitialDraft.isPublic);
  const [content, setContent] = useState<MaterialPackageContent>(normalizedInitialDraft.content);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [activeSectionKey, setActiveSectionKey] = useState("");
  const [draggedSectionKey, setDraggedSectionKey] = useState("");
  const [dragOverSectionKey, setDragOverSectionKey] = useState("");

  useEffect(() => {
    const nextDraft = normalizeDraft(initialDraft, readOnly);
    setName(nextDraft.name);
    setDescription(nextDraft.description);
    setCoverUrl(nextDraft.coverUrl);
    setIsPublic(nextDraft.isPublic);
    setContent(nextDraft.content);
  }, [initialDraft, readOnly, valueKey]);

  const sections = useMemo(() => buildSections(content), [content]);
  const activeSection = useMemo(
    () => sections.find(section => section.key === activeSectionKey) ?? sections[0] ?? null,
    [activeSectionKey, sections],
  );
  const totalMaterialCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.materials.length, 0),
    [sections],
  );
  const totalAssetCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.materials.reduce((materialSum, material) => materialSum + (material.node.messages?.length ?? 0), 0), 0),
    [sections],
  );
  const canDeleteSection = useMemo(
    () => !readOnly && sections.filter(section => section.sectionType === "folder").length > 1 && activeSection?.sectionType === "folder",
    [activeSection?.sectionType, readOnly, sections],
  );

  useEffect(() => {
    if (sections.length === 0) {
      if (activeSectionKey) {
        setActiveSectionKey("");
      }
      return;
    }

    if (!sections.some(section => section.key === activeSectionKey)) {
      setActiveSectionKey(sections[0]?.key ?? "");
    }
  }, [activeSectionKey, sections]);

  const updateMaterial = (
    sectionType: "root" | "folder",
    rootIndex: number,
    childIndex: number,
    updater: (node: MaterialNode) => MaterialNode,
  ) => {
    setContent((previous) => {
      const next = cloneContent(previous);
      next.root = Array.isArray(next.root) ? next.root : [];

      if (sectionType === "root") {
        const currentNode = next.root[childIndex] ?? createMaterialNode();
        next.root[childIndex] = updater(currentNode);
        return next;
      }

      const folderNode = next.root[rootIndex] ?? createDefaultSectionNode();
      const children = Array.isArray(folderNode.children) ? [...folderNode.children] : [];
      children[childIndex] = updater(children[childIndex] ?? createMaterialNode());
      next.root[rootIndex] = {
        ...folderNode,
        children,
      };
      return next;
    });
  };

  const addMaterialToSection = (section: MaterialSection) => {
    setContent((previous) => {
      const next = cloneContent(previous);
      next.root = Array.isArray(next.root) ? next.root : [];

      if (section.sectionType === "root") {
        next.root.push(createMaterialNode("新素材单元"));
        return next;
      }

      const folderNode = next.root[section.rootIndex] ?? createDefaultSectionNode(section.title);
      const children = Array.isArray(folderNode.children) ? [...folderNode.children] : [];
      children.push(createMaterialNode("新素材单元"));
      next.root[section.rootIndex] = {
        ...folderNode,
        children,
      };
      return next;
    });
  };

  const addChapter = () => {
    let nextChapterKey = "";
    setContent((previous) => {
      const next = cloneContent(previous);
      next.root = Array.isArray(next.root) ? next.root : [];
      const chapterCount = next.root.filter(node => node.type === MaterialNode.type.FOLDER).length;
      nextChapterKey = `folder-${next.root.length}`;
      next.root.push(createDefaultSectionNode(createChapterTitle(chapterCount + 1)));
      return next;
    });
    if (nextChapterKey) {
      setActiveSectionKey(nextChapterKey);
    }
  };

  const updateSectionTitle = (section: MaterialSection, nextTitle: string) => {
    if (section.sectionType !== "folder") {
      return;
    }

    setContent((previous) => {
      const next = cloneContent(previous);
      next.root = Array.isArray(next.root) ? next.root : [];
      const folderNode = next.root[section.rootIndex];
      if (!folderNode) {
        return next;
      }

      next.root[section.rootIndex] = {
        ...folderNode,
        name: nextTitle,
      };
      return next;
    });
  };

  const removeSection = (section: MaterialSection) => {
    if (section.sectionType !== "folder") {
      return;
    }

    const remainingSections = sections.filter(item => item.key !== section.key);
    setContent((previous) => {
      const next = cloneContent(previous);
      next.root = Array.isArray(next.root) ? next.root : [];
      next.root.splice(section.rootIndex, 1);
      return next;
    });
    setActiveSectionKey(remainingSections[0]?.key ?? "");
  };

  const reorderSections = (sourceKey: string, targetKey: string) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) {
      return;
    }

    setContent((previous) => {
      const next = cloneContent(previous);
      next.root = Array.isArray(next.root) ? next.root : [];
      const sourceIndex = sections.findIndex(section => section.key === sourceKey && section.sectionType === "folder");
      const targetIndex = sections.findIndex(section => section.key === targetKey && section.sectionType === "folder");

      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return next;
      }

      const [moved] = next.root.splice(sourceIndex, 1);
      if (!moved) {
        return next;
      }
      next.root.splice(targetIndex, 0, moved);
      return next;
    });
    setActiveSectionKey(sourceKey);
  };

  const removeMaterialFromSection = (section: MaterialSection, childIndex: number) => {
    setContent((previous) => {
      const next = cloneContent(previous);
      next.root = Array.isArray(next.root) ? next.root : [];

      if (section.sectionType === "root") {
        next.root.splice(childIndex, 1);
        return next;
      }

      const folderNode = next.root[section.rootIndex];
      if (!folderNode || !Array.isArray(folderNode.children)) {
        return next;
      }

      const children = [...folderNode.children];
      children.splice(childIndex, 1);
      next.root[section.rootIndex] = {
        ...folderNode,
        children,
      };
      return next;
    });
  };

  const appendMessageToMaterial = (
    section: MaterialSection,
    childIndex: number,
    message: MaterialMessageItem,
  ) => {
    updateMaterial(section.sectionType, section.rootIndex, childIndex, node => ({
      ...node,
      type: MaterialNode.type.MATERIAL,
      messages: [...(node.messages ?? []), message],
    }));
  };

  const removeMessageFromMaterial = (
    section: MaterialSection,
    childIndex: number,
    messageIndex: number,
  ) => {
    updateMaterial(section.sectionType, section.rootIndex, childIndex, node => ({
      ...node,
      messages: (node.messages ?? []).filter((_, index) => index !== messageIndex),
    }));
  };

  const handleCoverUpload = async (file: File) => {
    if (readOnly || isCoverUploading) {
      return;
    }

    setIsCoverUploading(true);
    const toastId = "material-cover-upload";
    toast.loading("封面上传中...", { id: toastId });

    try {
      const url = await uploadUtilsRef.current.uploadImg(file, 1);
      setCoverUrl(url);
      toast.success("封面上传成功", { id: toastId });
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.error(`封面上传失败：${message}`, { id: toastId });
    }
    finally {
      setIsCoverUploading(false);
    }
  };

  const handleSave = async () => {
    if (!onSave) {
      return;
    }

    if (!name.trim()) {
      toast.error("素材包名称不能为空");
      return;
    }

    await onSave({
      name: name.trim(),
      description: description.trim(),
      coverUrl: coverUrl.trim(),
      isPublic,
      content,
    });
  };

  const fieldClassName = "w-full rounded-md border border-base-300 bg-base-200/80 px-3 py-2.5 text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";
  const textareaClassName = "w-full rounded-md border border-base-300 bg-base-200/80 px-3 py-3 text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="rounded-[28px] border border-base-300 bg-base-100/95 text-base-content shadow-xl">
      <div className="border-b border-base-300 px-6 py-6 md:px-8">
        <div className="text-2xl font-semibold tracking-tight text-base-content">{title}</div>
        {subtitle && <div className="mt-2 max-w-3xl text-sm leading-7 text-base-content/60">{subtitle}</div>}
      </div>

      <div className="space-y-8 p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-base-content/80">素材包名称</span>
              <input
                type="text"
                className={fieldClassName}
                value={name}
                onChange={event => setName(event.target.value)}
                disabled={readOnly}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-base-content/80">描述</span>
              <textarea
                className={`${textareaClassName} min-h-32`}
                value={description}
                onChange={event => setDescription(event.target.value)}
                disabled={readOnly}
              />
            </label>

            {showPublicToggle && (
              <div className="flex items-center justify-between rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3">
                <div>
                  <div className="font-medium text-base-content/90">公开至素材广场</div>
                  <div className="text-sm text-base-content/60">允许其他创作者浏览并下载此素材包。</div>
                </div>
                <button
                  type="button"
                  className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition ${
                    isPublic
                      ? "border-primary/40 bg-primary/90"
                      : "border-base-300 bg-base-100"
                  } ${readOnly ? "cursor-not-allowed opacity-60" : "hover:border-primary/40"}`}
                  aria-pressed={isPublic}
                  onClick={() => {
                    if (!readOnly) {
                      setIsPublic(prev => !prev);
                    }
                  }}
                  disabled={readOnly}
                >
                  <span
                    className={`inline-block size-6 rounded-full bg-white shadow transition-transform ${
                      isPublic ? "translate-x-[1.45rem]" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          <div className="rounded-[26px] border border-base-300 bg-base-200/55 p-4">
            <div className="mb-3 text-sm font-medium text-base-content/75">封面图片</div>
            <div className="overflow-hidden rounded-[22px] border border-base-300 bg-base-950/90 shadow-inner">
              {coverUrl
                ? (
                    <img
                      src={coverUrl}
                      alt={name || "素材包封面"}
                      className="aspect-square w-full object-cover"
                    />
                  )
                : (
                    <div className="flex aspect-square w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))] text-base-content/40">
                      <PackageIcon className="size-16" weight="fill" />
                    </div>
                  )}
            </div>

            {!readOnly && (
              <div className="mt-4">
                <ImgUploader setImg={(file) => { void handleCoverUpload(file); }}>
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-medium text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
                    disabled={isCoverUploading}
                  >
                    <ImageIcon className="size-4" />
                    <span>{isCoverUploading ? "上传中..." : "上传封面"}</span>
                  </button>
                </ImgUploader>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[26px] border border-base-300 bg-base-200/45 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-base-content">
              <SquaresFourIcon className="size-4 text-primary" weight="fill" />
              <span className="text-sm font-semibold">素材列表</span>
            </div>
            <span className="rounded-full border border-base-300 bg-base-100/80 px-3 py-1 text-xs text-base-content/60">
              {`${totalMaterialCount} 个素材单元`}
            </span>
            <span className="rounded-full border border-base-300 bg-base-100/80 px-3 py-1 text-xs text-base-content/60">
              {`${totalAssetCount} 个素材条目`}
            </span>
          </div>

          <div className="mt-5 space-y-6">
            {sections.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-base-300/80 pb-3">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    {sections.map((section) => {
                      const isActive = section.key === activeSection?.key;
                      const tabClassName = `inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-sm transition ${
                        isActive
                          ? "border-primary/35 bg-primary/10 text-primary shadow-sm"
                          : "border-base-300 bg-base-100/70 text-base-content/70 hover:border-primary/20 hover:text-base-content"
                      } ${dragOverSectionKey === section.key ? "border-primary/50 ring-2 ring-primary/15" : ""}`;

                      if (!readOnly && isActive && section.sectionType === "folder") {
                        return (
                          <div
                            key={section.key}
                            className={`${tabClassName} min-w-[140px]`}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", section.key);
                              setDraggedSectionKey(section.key);
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                              if (draggedSectionKey && draggedSectionKey !== section.key) {
                                setDragOverSectionKey(section.key);
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              reorderSections(draggedSectionKey, section.key);
                              setDraggedSectionKey("");
                              setDragOverSectionKey("");
                            }}
                            onDragEnd={() => {
                              setDraggedSectionKey("");
                              setDragOverSectionKey("");
                            }}
                          >
                            <DotsSixVerticalIcon className="mr-2 size-4 shrink-0 text-current/55" />
                            <input
                              type="text"
                              className="w-full bg-transparent text-sm font-medium text-current transition focus:outline-none"
                              value={section.title}
                              onChange={event => updateSectionTitle(section, event.target.value)}
                              placeholder="章节名称"
                            />
                          </div>
                        );
                      }

                      return (
                        <button
                          key={section.key}
                          type="button"
                          className={tabClassName}
                          onClick={() => setActiveSectionKey(section.key)}
                          draggable={!readOnly}
                          onDragStart={(event) => {
                            if (readOnly) {
                              return;
                            }
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", section.key);
                            setDraggedSectionKey(section.key);
                          }}
                          onDragOver={(event) => {
                            if (readOnly) {
                              return;
                            }
                            event.preventDefault();
                            if (draggedSectionKey && draggedSectionKey !== section.key) {
                              setDragOverSectionKey(section.key);
                            }
                          }}
                          onDrop={(event) => {
                            if (readOnly) {
                              return;
                            }
                            event.preventDefault();
                            reorderSections(draggedSectionKey, section.key);
                            setDraggedSectionKey("");
                            setDragOverSectionKey("");
                          }}
                          onDragEnd={() => {
                            setDraggedSectionKey("");
                            setDragOverSectionKey("");
                          }}
                        >
                          {!readOnly && <DotsSixVerticalIcon className="mr-2 size-4 shrink-0 text-current/55" />}
                          <span className="truncate">{section.title}</span>
                        </button>
                      );
                    })}
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-2">
                      {canDeleteSection && (
                        <button
                          type="button"
                          className="inline-flex size-9 items-center justify-center rounded-md border border-base-300 bg-base-100/80 text-base-content/65 transition hover:border-error/30 hover:bg-error/10 hover:text-error"
                          onClick={() => {
                            if (activeSection) {
                              removeSection(activeSection);
                            }
                          }}
                          aria-label="删除当前章节"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex size-9 items-center justify-center rounded-md border border-base-300 bg-base-100/80 text-base-content/65 transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                        onClick={addChapter}
                        aria-label="添加新章节"
                      >
                        <PlusIcon className="size-4" weight="bold" />
                      </button>
                    </div>
                  )}
                </div>

                {activeSection && (
                  <>
                    {activeSection.hiddenFolderCount > 0 && (
                      <div className="text-xs text-base-content/55">
                        {`当前章节下还有 ${activeSection.hiddenFolderCount} 个子文件夹，保存时会继续保留。`}
                      </div>
                    )}

                    <div className="grid gap-4 xl:grid-cols-2">
                      {activeSection.materials.map(material => (
                        <div
                          key={`${activeSection.key}-${material.childIndex}`}
                          className="rounded-[24px] border border-base-300 bg-base-100/88 p-5 shadow-sm"
                        >
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-3">
                                <input
                                  type="text"
                                  className={fieldClassName}
                                  value={material.node.name ?? ""}
                                  onChange={event => updateMaterial(activeSection.sectionType, activeSection.rootIndex, material.childIndex, node => ({
                                    ...node,
                                    type: MaterialNode.type.MATERIAL,
                                    name: event.target.value,
                                  }))}
                                  placeholder="素材单元标题"
                                  disabled={readOnly}
                                />
                                <textarea
                                  className={`${textareaClassName} min-h-24`}
                                  value={material.node.note ?? ""}
                                  onChange={event => updateMaterial(activeSection.sectionType, activeSection.rootIndex, material.childIndex, node => ({
                                    ...node,
                                    type: MaterialNode.type.MATERIAL,
                                    note: event.target.value,
                                  }))}
                                  placeholder="描述这个素材单元的使用场景、氛围或用途"
                                  disabled={readOnly}
                                />
                              </div>

                              {!readOnly && (
                                <button
                                  type="button"
                                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-200/70 text-base-content/65 transition hover:border-error/30 hover:bg-error/10 hover:text-error"
                                  onClick={() => removeMaterialFromSection(activeSection, material.childIndex)}
                                  aria-label="删除素材单元"
                                >
                                  <TrashIcon className="size-4" />
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {(material.node.messages?.length ?? 0) > 0
                                ? (
                                    <div className="space-y-3">
                                      {(material.node.messages ?? []).map((message, messageIndex) => {
                                        const presentation = getMessagePresentation(message);
                                        const assetKey = [
                                          activeSection.key,
                                          material.childIndex,
                                          message.messageType ?? "unknown",
                                          presentation.url ?? "",
                                          presentation.fileName,
                                          presentation.metaText,
                                        ].join("-");

                                        return (
                                          <AssetCard
                                            key={assetKey}
                                            message={message}
                                            readOnly={readOnly}
                                            onRemove={() => removeMessageFromMaterial(activeSection, material.childIndex, messageIndex)}
                                          />
                                        );
                                      })}
                                    </div>
                                  )
                                : (
                                    <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/35 px-4 py-6 text-sm text-base-content/55">
                                      这个素材单元还没有素材条目，先上传图片、音频、视频或文件吧。
                                    </div>
                                  )}

                              {!readOnly && (
                                <MaterialPackageAssetUploadMenu
                                  onUploaded={message => appendMessageToMaterial(activeSection, material.childIndex, message)}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {!readOnly && (
                        <button
                          type="button"
                          className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-base-300 bg-base-100/35 text-base-content/55 transition hover:border-primary/35 hover:bg-primary/[0.04] hover:text-base-content"
                          onClick={() => addMaterialToSection(activeSection)}
                        >
                          <div className="flex size-12 items-center justify-center rounded-full border border-base-300 bg-base-200/70">
                            <PlusIcon className="size-5" weight="bold" />
                          </div>
                          <div className="space-y-1 text-center">
                            <div className="text-sm font-medium">添加新素材单元</div>
                            <div className="text-xs text-base-content/45">支持一个单元内继续添加多条素材，例如背景图和 BGM。</div>
                          </div>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {onDelete && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-medium text-base-content transition hover:border-error/30 hover:bg-error/10 hover:text-error"
                onClick={() => void onDelete()}
                disabled={deletePending}
              >
                {deletePending ? "删除中..." : deleteLabel}
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-content shadow-[0_18px_38px_rgba(59,130,246,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(59,130,246,0.28)]"
              onClick={() => void handleSave()}
              disabled={savePending}
            >
              {savePending ? "保存中..." : saveLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
