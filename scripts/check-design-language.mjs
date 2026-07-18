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

function assertNotContains(relativePath, terms) {
  const content = read(relativePath);
  const presentTerms = terms.filter(term => content.includes(term));
  if (presentTerms.length > 0) {
    throw new Error(`${relativePath} 包含禁止的设计语言耦合：${presentTerms.join("、")}`);
  }
}

function readStringArrayConstant(relativePath, constantName) {
  const sourceText = read(relativePath);
  const sourceFile = ts.createSourceFile(relativePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let values;

  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === constantName && node.initializer) {
      const initializer = ts.isAsExpression(node.initializer) ? node.initializer.expression : node.initializer;
      if (ts.isArrayLiteralExpression(initializer) && initializer.elements.every(ts.isStringLiteral)) {
        values = initializer.elements.map(element => element.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (!values) {
    throw new Error(`${relativePath} 无法读取字符串数组常量 ${constantName}`);
  }
  return values;
}

function assertSemanticAppearances() {
  const buttonPath = "apps/web/app/components/common/Button.tsx";
  const statusPath = "apps/web/app/components/common/StatusPrimitives.tsx";
  const tones = readStringArrayConstant(buttonPath, "BUTTON_TONES");
  const appearances = readStringArrayConstant("apps/web/app/components/common/DesignLanguage.tsx", "SEMANTIC_APPEARANCES");
  const selectors = tones.flatMap(tone => appearances.map(appearance => `.tc-button-${appearance}.tc-button-tone-${tone}`));

  assertContains("apps/web/app/app.css", selectors);
  assertContains("apps/web/app/components/designSystem/DesignSystemPage.tsx", ["BUTTON_TONES.map", "BUTTON_APPEARANCES.map"]);
  assertContains(statusPath, ["STATUS_TONES", "STATUS_APPEARANCES", "tc-badge-${appearance}", "tc-count-badge-${appearance}", "tc-inline-alert-${appearance}"]);
  assertContains("apps/web/app/components/designSystem/DesignSystemPage.tsx", ["STATUS_TONES.map", "STATUS_APPEARANCES.map", "SEMANTIC_APPEARANCES.map", "appToast.info", "appToast.success", "appToast.warning", "appToast.error"]);
  assertContains("apps/web/app/components/common/appToast/appToast.tsx", ["AppToaster", "position=\"top-center\"", "shadow-xl", "appearance?: SemanticAppearance"]);
}

function getJsxTagName(node) {
  return ts.isIdentifier(node.tagName) ? node.tagName.text : null;
}

function getJsxAttribute(node, name) {
  return node.attributes.properties.find(property => (
    ts.isJsxAttribute(property) && property.name.text === name
  ));
}

function getStaticJsxAttributeValue(node, name) {
  const attribute = getJsxAttribute(node, name);
  if (!attribute?.initializer) {
    return undefined;
  }
  if (ts.isStringLiteral(attribute.initializer)) {
    return attribute.initializer.text;
  }
  if (
    ts.isJsxExpression(attribute.initializer)
    && attribute.initializer.expression
    && ts.isStringLiteralLike(attribute.initializer.expression)
  ) {
    return attribute.initializer.expression.text;
  }
  return undefined;
}

const LEGACY_SOLID_BUTTON_VARIANTS = new Set(["primary", "success", "warning", "error"]);

function isStaticallySolidButton(node) {
  const tagName = getJsxTagName(node);
  if (tagName !== "Button" && tagName !== "IconButton") {
    return false;
  }

  const appearance = getStaticJsxAttributeValue(node, "appearance");
  if (appearance) {
    return appearance === "solid";
  }
  const variant = getStaticJsxAttributeValue(node, "variant");
  if (variant) {
    return LEGACY_SOLID_BUTTON_VARIANTS.has(variant);
  }

  // Button 兼容 API 中，仅传 tone 时仍默认 solid。
  return getJsxAttribute(node, "tone") != null;
}

function assertDialogActionsHaveSingleSolidButton() {
  const sourceRoot = resolve(workspaceRoot, "apps/web/app");
  const violations = [];
  const files = fg.sync(["**/*.tsx"], { cwd: sourceRoot, absolute: true, onlyFiles: true });

  for (const filePath of files) {
    const sourceText = readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if (ts.isJsxElement(node) && getJsxTagName(node.openingElement) === "DialogActions") {
        const solidButtons = [];
        const collectSolidButtons = (child) => {
          if (
            child !== node
            && ts.isJsxElement(child)
            && getJsxTagName(child.openingElement) === "DialogActions"
          ) {
            return;
          }
          if (
            (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child))
            && isStaticallySolidButton(child)
          ) {
            solidButtons.push(child);
          }
          ts.forEachChild(child, collectSolidButtons);
        };
        ts.forEachChild(node, collectSolidButtons);

        if (solidButtons.length > 1) {
          const actionPosition = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          const buttonLines = solidButtons.map((button) => {
            return sourceFile.getLineAndCharacterOfPosition(button.getStart(sourceFile)).line + 1;
          });
          violations.push(
            `${relative(workspaceRoot, filePath).replaceAll("\\", "/")}:${actionPosition.line + 1}（solid 按钮：${buttonLines.join("、")}）`,
          );
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  if (violations.length > 0) {
    throw new Error(`同一 DialogActions 最多允许一个 solid 按钮：${violations.join("、")}`);
  }
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
    terms: ["Skeleton", "Badge", "Divider", "ProgressBar"],
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
assertContains("apps/web/app/components/common/Tabs.tsx", ["selectionClassName"]);
assertContains("apps/web/app/components/common/Button.tsx", ["BUTTON_TONES", "BUTTON_APPEARANCES", "ButtonTone", "ButtonAppearance", "tone", "appearance"]);
assertNotContains("apps/web/app/components/common/Button.tsx", ["selectionClassName"]);
assertContains("apps/web/app/components/common/MenuPopover.tsx", ["PopoverSurface", "MenuSurface", "MenuItem", "useDismissibleLayer"]);
assertContains("apps/web/app/components/common/portalTooltip.tsx", ["tc-surface-floating", "role=\"tooltip\""]);
assertMenuItemsUsePrimitive();
assertSemanticAppearances();
assertDialogActionsHaveSingleSolidButton();

assertContains("apps/web/app/components/aiImage/sidebar/ProBottomSettingsDrawer.tsx", ["RangeInput", "SelectInput", "TextInput"]);
assertContains("apps/web/app/components/Role/RoleTrashPage.tsx", ["Surface", "Text", "StateView", "Badge", "Skeleton"]);
assertContains("apps/web/app/components/chat/window/spaceWebgalGameConfigSection.tsx", ["Switch", "density=\"compact\""]);

assertContains("DESIGN.md", [
  "### 四档语义外观",
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
