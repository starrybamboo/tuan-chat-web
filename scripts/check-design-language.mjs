import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import ts from "typescript";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(resolve(workspaceRoot, relativePath), "utf8");
}

function assertContains(relativePath, terms) {
  const content = read(relativePath);
  const missingTerms = terms.filter(term => !content.includes(term));
  if (missingTerms.length > 0) {
    throw new Error(`${relativePath} 缺少设计语言证据：${missingTerms.join("、")}`);
  }
}

function getJsxTagName(node) {
  return ts.isIdentifier(node.tagName) ? node.tagName.text : null;
}

function getJsxAttribute(node, name) {
  return node.attributes.properties.find(property => (
    ts.isJsxAttribute(property) && property.name.text === name
  ));
}

function isMenuContainer(node) {
  const openingElement = ts.isJsxElement(node) ? node.openingElement : node;
  const tagName = getJsxTagName(openingElement);
  if (tagName === "MenuSurface" || tagName === "DropdownMenu") {
    return true;
  }
  const roleAttribute = getJsxAttribute(openingElement, "role");
  return roleAttribute?.initializer && ts.isStringLiteral(roleAttribute.initializer) && roleAttribute.initializer.text === "menu";
}

function isInsideDropdownTrigger(node, boundary) {
  for (let current = node.parent; current && current !== boundary; current = current.parent) {
    if (ts.isJsxAttribute(current) && current.name.text === "trigger") {
      return true;
    }
  }
  return false;
}

function assertMenuItemsUsePrimitive() {
  const sourceRoot = resolve(workspaceRoot, "apps/web/app");
  const violations = [];
  const files = fg.sync(["**/*.tsx"], { cwd: sourceRoot, absolute: true, onlyFiles: true });

  for (const filePath of files) {
    const sourceText = readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && getJsxTagName(node) === "button") {
        for (let current = node.parent; current; current = current.parent) {
          if ((ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) && isMenuContainer(current)) {
            const openingElement = ts.isJsxElement(current) ? current.openingElement : current;
            if (getJsxTagName(openingElement) !== "DropdownMenu" || !isInsideDropdownTrigger(node, current)) {
              const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
              violations.push(`${relative(workspaceRoot, filePath).replaceAll("\\", "/")}:${position.line + 1}`);
            }
            break;
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  if (violations.length > 0) {
    throw new Error(`菜单容器内存在绕过 MenuItem 的裸 button：${violations.join("、")}`);
  }
}

const checks = [
  {
    name: "表单控件",
    file: "apps/web/app/components/common/FormField.tsx",
    terms: ["TextInput", "TextArea", "SelectInput", "Checkbox", "Radio", "Switch", "RangeInput", "FileInput", "ColorInput", "ChoiceField"],
  },
  {
    name: "文字系统",
    file: "apps/web/app/components/common/DesignLanguage.tsx",
    terms: ["pageTitle", "sectionTitle", "componentTitle", "supporting", "data", "code", "textClassName"],
  },
  {
    name: "表面层级",
    file: "apps/web/app/components/common/DesignLanguage.tsx",
    terms: ["canvas", "content", "floating", "surfaceClassName", "Surface"],
  },
  {
    name: "头像裁切",
    file: "apps/web/app/components/common/DesignLanguage.tsx",
    terms: ["MaskShape", "maskClassName", "mask-squircle"],
  },
  {
    name: "尺寸与节奏",
    file: "apps/web/app/app.css",
    terms: ["--spacing-control-compact", "--spacing-control-default", "--spacing-icon-compact", "--spacing-hit-default"],
  },
  {
    name: "状态语法",
    file: "apps/web/app/app.css",
    terms: [".tc-interactive", "[aria-pressed=\"true\"]", ":focus-visible", ".tc-drop-target", "[readonly]"],
  },
  {
    name: "内容状态",
    file: "apps/web/app/components/common/StateView.tsx",
    terms: ["empty", "loading", "error", "offline", "refreshing", "progress", "ProgressBar"],
  },
  {
    name: "次级控件",
    file: "apps/web/app/components/common/StatusPrimitives.tsx",
    terms: ["Skeleton", "Badge", "Tag", "Divider", "ProgressBar"],
  },
  {
    name: "媒体语言",
    file: "apps/web/app/components/common/MediaFrame.tsx",
    terms: ["MediaFrame", "MediaImageFrame", "UploadDropZone", "square", "portrait", "landscape", "video"],
  },
];

for (const check of checks) {
  assertContains(check.file, check.terms);
}

assertContains("apps/web/app/components/common/Tabs.tsx", ["ArrowLeft", "ArrowRight", "Home", "End", "aria-selected"]);
assertContains("apps/web/app/components/common/MenuPopover.tsx", ["PopoverSurface", "MenuSurface", "MenuItem", "useDismissibleLayer"]);
assertContains("apps/web/app/components/common/portalTooltip.tsx", ["tc-surface-floating", "role=\"tooltip\""]);
assertMenuItemsUsePrimitive();

assertContains("apps/web/app/components/aiImage/sidebar/ProBottomSettingsDrawer.tsx", ["RangeInput", "SelectInput", "Switch", "TextInput"]);
assertContains("apps/web/app/components/Role/RoleTrashPage.tsx", ["Surface", "Text", "StateView", "Badge", "Skeleton"]);
assertContains("apps/web/app/components/chat/window/spaceWebgalGameConfigSection.tsx", ["Switch", "density=\"compact\""]);

assertContains("DESIGN.md", [
  "### 表面层级",
  "### 文字角色",
  "### 尺寸与节奏",
  "### 表单语法",
  "### 状态语法",
  "### 内容状态",
  "### 次级控件",
  "### 媒体语言",
]);

console.log(`设计语言检查通过：${checks.length}/${checks.length} 个领域均具备实现与跨模块证据。`);
