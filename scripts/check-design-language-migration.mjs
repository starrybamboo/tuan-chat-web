import { relative, resolve } from "node:path";
import process from "node:process";

import fg from "fast-glob";
import ts from "typescript";

const workspaceRoot = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(workspaceRoot, "apps/web/app");
const strict = process.argv.includes("--strict");
const summaryOnly = process.argv.includes("--summary");

const allowedIntrinsicFiles = new Set([
  "apps/web/app/components/common/FormField.tsx",
  "apps/web/app/components/common/MediaFrame.tsx",
  "apps/web/app/components/common/StatusPrimitives.tsx",
  "apps/web/app/components/common/mediaImage.tsx",
  "apps/web/app/components/common/resizableImg.tsx",
  "apps/web/app/components/common/uploader/imgUploader.tsx",
  "apps/web/app/components/common/uploader/imgUploaderWithCropper.tsx",
]);

const allowedLegacyClassLabels = new Map([
  ["apps/web/app/components/common/Button.tsx", new Set(["旧 Button class"])],
  ["apps/web/app/components/common/Avatar.tsx", new Set(["旧 Avatar class"])],
  ["apps/web/app/components/common/DialogFrame.tsx", new Set(["旧 Modal class"])],
  [
    "apps/web/app/components/common/FormField.tsx",
    new Set([
      "旧 Checkbox class",
      "旧 Radio class",
      "旧 Toggle class",
      "旧 Range class",
      "旧 FileInput class",
    ]),
  ],
  ["apps/web/app/components/common/MediaFrame.tsx", new Set(["绕过 UploadDropZone 原语"])],
  [
    "apps/web/app/components/common/MenuPopover.tsx",
    new Set(["内部 Surface class", "绕过 Menu 原语"]),
  ],
  ["apps/web/app/components/common/portalTooltip.tsx", new Set(["内部 Surface class"])],
  [
    "apps/web/app/components/common/StatusPrimitives.tsx",
    new Set([
      "旧 Progress class",
      "绕过 Badge 原语",
      "绕过 Skeleton 原语",
      "绕过 Divider 原语",
      "绕过 ProgressBar 原语",
    ]),
  ],
  ["apps/web/app/components/common/Tabs.tsx", new Set(["绕过 Tabs 原语"])],
  [
    "apps/web/app/components/common/DesignLanguage.tsx",
    new Set(["旧 Mask class", "内部 Surface class", "内部 Interactive class"]),
  ],
]);

const trackedIntrinsicTags = new Map([
  ["input", "原生 input"],
  ["textarea", "原生 textarea"],
  ["select", "原生 select"],
  ["img", "原生 img"],
  ["progress", "原生 progress"],
]);

const legacyClassPatterns = [
  { label: "旧 Tabs class", pattern: /(?:^|\s)tabs(?:-|\s|$)/ },
  { label: "旧 Badge class", pattern: /(?:^|\s)badge(?:-|\s|$)/ },
  { label: "旧 Skeleton class", pattern: /(?:^|\s)skeleton(?:-|\s|$)/ },
  { label: "旧 Progress class", pattern: /(?:^|\s)progress(?:-|\s|$)/ },
  { label: "旧 Input class", pattern: /(?:^|\s)input(?:\s|$|-(?:bordered|ghost|primary|secondary|accent|info|success|warning|error|xs|sm|md|lg))/ },
  { label: "旧 Textarea class", pattern: /(?:^|\s)textarea(?:\s|$|-(?:bordered|ghost|primary|secondary|accent|info|success|warning|error|xs|sm|md|lg))/ },
  { label: "旧 Select class", pattern: /(?:^|\s)select(?:\s|$|-(?:bordered|ghost|primary|secondary|accent|info|success|warning|error|xs|sm|md|lg))/ },
  { label: "旧 Checkbox class", pattern: /(?:^|\s)checkbox(?:\s|$|-(?:primary|secondary|accent|info|success|warning|error|xs|sm|md|lg))/ },
  { label: "旧 Radio class", pattern: /(?:^|\s)radio(?:\s|$|-(?:primary|secondary|accent|info|success|warning|error|xs|sm|md|lg))/ },
  { label: "旧 Toggle class", pattern: /(?:^|\s)toggle(?:\s|$|-(?:primary|secondary|accent|info|success|warning|error|xs|sm|md|lg))/ },
  { label: "旧 Range class", pattern: /(?:^|\s)range(?:\s|$|-(?:primary|secondary|accent|info|success|warning|error|xs|sm|md|lg))/ },
  { label: "旧 FileInput class", pattern: /(?:^|\s)file-input(?:\s|$|-(?:bordered|ghost|primary|secondary|accent|info|success|warning|error|xs|sm|md|lg))/ },
  { label: "旧 Button class", pattern: /(?:^|\s)btn(?:-|\s|$)/ },
  { label: "旧 Menu class", pattern: /(?:^|\s)menu(?:-|\s|$)/ },
  { label: "旧 Dropdown class", pattern: /(?:^|\s)dropdown(?:\s|$|-(?:content|start|center|end|top|bottom|left|right|hover|open))/ },
  { label: "旧 Tooltip class", pattern: /(?:^|\s)tooltip(?:\s|$|-(?:top|bottom|left|right|open|primary|secondary|accent|info|success|warning|error))/ },
  { label: "旧 Modal class", pattern: /(?:^|\s)modal(?:\s|$|-(?:box|action|backdrop|toggle|open|top|middle|bottom))/ },
  { label: "旧 Card class", pattern: /(?:^|\s)card(?:\s|$|-(?:body|title|actions|border|dash|side|image-full|compact|normal|xs|sm|md|lg|xl))/ },
  { label: "旧 Collapse class", pattern: /(?:^|\s)collapse(?:\s|$|-(?:title|content|arrow|plus|open|close))/ },
  { label: "旧 Alert class", pattern: /(?:^|\s)alert(?:-|\s|$)/ },
  { label: "旧 Divider class", pattern: /(?:^|\s)divider(?:\s|$|-(?:horizontal|vertical|start|end|neutral|primary|secondary|accent|info|success|warning|error))/ },
  { label: "旧 Loading class", pattern: /(?:^|\s)loading(?:\s|$|-(?:spinner|dots|ring|ball|bars|infinity|xs|sm|md|lg))/ },
  { label: "旧 Join class", pattern: /(?:^|\s)join(?:\s|$|-(?:item|vertical|horizontal))/ },
  { label: "旧 FormLayout class", pattern: /(?:^|\s)(?:form-control|label|label-text|label-text-alt)(?:\s|$)/ },
  { label: "旧 Avatar class", pattern: /(?:^|\s)avatar(?:-(?:group|placeholder|online|offline))?(?:\s|$)/ },
  { label: "旧 Breadcrumbs class", pattern: /(?:^|\s)breadcrumbs(?:\s|$)/ },
  { label: "旧 Calendar class", pattern: /(?:^|\s)calendar(?:-|\s|$)/ },
  { label: "旧 Carousel class", pattern: /(?:^|\s)carousel(?:-|\s|$)/ },
  { label: "旧 Chat class", pattern: /(?:^|\s)chat-(?:start|end|image|header|footer|bubble)(?:-|\s|$)/ },
  { label: "旧 Countdown class", pattern: /(?:^|\s)countdown(?:\s|$)/ },
  { label: "旧 Diff class", pattern: /(?:^|\s)diff(?:-|\s|$)/ },
  { label: "旧 Dock class", pattern: /(?:^|\s)dock(?:-|\s|$)/ },
  { label: "旧 Drawer class", pattern: /(?:^|\s)drawer(?:-|\s|$)/ },
  { label: "旧 Fab class", pattern: /(?:^|\s)fab(?:-|\s|$)/ },
  { label: "旧 Fieldset class", pattern: /(?:^|\s)fieldset(?:-|\s|$)/ },
  { label: "旧 Filter class", pattern: /(?:^|\s)filter(?:-|\s|$)/ },
  { label: "旧 Footer class", pattern: /(?:^|\s)footer(?:-|\s|$)/ },
  { label: "旧 Hero class", pattern: /(?:^|\s)hero(?:-|\s|$)/ },
  { label: "旧 Hover3d class", pattern: /(?:^|\s)hover-3d(?:\s|$)/ },
  { label: "旧 HoverGallery class", pattern: /(?:^|\s)hover-gallery(?:\s|$)/ },
  { label: "旧 Indicator class", pattern: /(?:^|\s)indicator(?:-item)?(?:\s|$)/ },
  { label: "旧 Kbd class", pattern: /(?:^|\s)kbd(?:-|\s|$)/ },
  { label: "旧 Link class", pattern: /(?:^|\s)link(?:-|\s|$)/ },
  { label: "旧 List class", pattern: /(?:^|\s)list(?:-(?:row|col-grow|col-wrap))?(?:\s|$)/ },
  { label: "旧 Mask class", pattern: /(?:^|\s)mask(?:-|\s|$)/ },
  { label: "旧 Mockup class", pattern: /(?:^|\s)mockup-(?:browser|code|phone|window)(?:-|\s|$)/ },
  { label: "旧 Navbar class", pattern: /(?:^|\s)navbar(?:-(?:start|center|end))?(?:\s|$)/ },
  { label: "旧 RadialProgress class", pattern: /(?:^|\s)radial-progress(?:\s|$)/ },
  { label: "旧 Rating class", pattern: /(?:^|\s)rating(?:-|\s|$)/ },
  { label: "旧 Stack class", pattern: /(?:^|\s)stack(?:\s|$)/ },
  { label: "旧 Stat class", pattern: /(?:^|\s)stat(?:s|-(?:figure|title|value|desc|actions)|\s|$)/ },
  { label: "旧 Status class", pattern: /(?:^|\s)status(?:-|\s|$)/ },
  { label: "旧 Steps class", pattern: /(?:^|\s)steps?(?:-|\s|$)/ },
  { label: "旧 Swap class", pattern: /(?:^|\s)swap(?:-|\s|$)/ },
  { label: "旧 Table class", pattern: /(?:^|\s)table(?:-(?:zebra|pin-rows|pin-cols|xs|sm|md|lg|xl)|\s|$)/ },
  { label: "旧 TextRotate class", pattern: /(?:^|\s)text-rotate(?:-|\s|$)/ },
  { label: "旧 Timeline class", pattern: /(?:^|\s)timeline(?:-|\s|$)/ },
  { label: "旧 Toast class", pattern: /(?:^|\s)toast(?:-|\s|$)/ },
  { label: "旧 Validator class", pattern: /(?:^|\s)validator(?:-|\s|$)/ },
  { label: "旧 DaisyUI radius class", pattern: /(?:^|\s)rounded-(?:box|field|selector)(?:\s|$)/ },
  { label: "绕过 Badge 原语", pattern: /(?:^|\s)tc-badge(?:-|\s|$)/ },
  { label: "绕过 Skeleton 原语", pattern: /(?:^|\s)tc-skeleton(?:-|\s|$)/ },
  { label: "绕过 Tabs 原语", pattern: /(?:^|\s)tc-tab(?:-|\s|$)/ },
  { label: "绕过 Menu 原语", pattern: /(?:^|\s)tc-menu(?:-|\s|$)/ },
  { label: "绕过 Divider 原语", pattern: /(?:^|\s)tc-divider(?:-|\s|$)/ },
  { label: "绕过 ProgressBar 原语", pattern: /(?:^|\s)tc-progress(?:-|\s|$)/ },
  { label: "绕过 UploadDropZone 原语", pattern: /(?:^|\s)tc-drop-target(?:-|\s|$)/ },
  { label: "内部 Surface class", pattern: /(?:^|\s)tc-surface-(?:canvas|content|floating|inset)(?:\s|$)/ },
  { label: "内部 Interactive class", pattern: /(?:^|\s)tc-interactive(?:\s|$)/ },
  { label: "内部 Overlay class", pattern: /(?:^|\s)tc-overlay(?:\s|$)/ },
];

function normalizedRelativePath(absolutePath) {
  return relative(workspaceRoot, absolutePath).replaceAll("\\", "/");
}

function getJsxTagName(node) {
  if (ts.isIdentifier(node.tagName)) {
    return node.tagName.text;
  }
  return null;
}

function getStaticExpressionText(expression) {
  if (!expression) {
    return "";
  }
  const parts = [];
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      parts.push(node.text);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      parts.push(node.head.text);
      for (const span of node.templateSpans) {
        visit(span.expression);
        parts.push(span.literal.text);
      }
      return;
    }
    if (ts.isConditionalExpression(node)) {
      visit(node.whenTrue);
      visit(node.whenFalse);
      return;
    }
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        visit(node.left);
        visit(node.right);
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return parts.join(" ");
}

function getClassNameText(attribute) {
  if (!attribute.initializer) {
    return "";
  }
  if (ts.isStringLiteral(attribute.initializer)) {
    return attribute.initializer.text;
  }
  if (!ts.isJsxExpression(attribute.initializer)) {
    return "";
  }
  return getStaticExpressionText(attribute.initializer.expression);
}

function getPropertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  return "";
}

function recordFinding(findings, sourceFile, node, label) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  findings.push({
    file: normalizedRelativePath(sourceFile.fileName),
    line: position.line + 1,
    label,
  });
}

function inspectSourceFile(sourceFile) {
  const findings = [];
  const relativePath = normalizedRelativePath(sourceFile.fileName);
  const allowIntrinsic = allowedIntrinsicFiles.has(relativePath);
  const allowedLabels = allowedLegacyClassLabels.get(relativePath) ?? new Set();

  function inspectClassName(classNameText, node) {
    for (const legacyPattern of legacyClassPatterns) {
      if (!allowedLabels.has(legacyPattern.label) && legacyPattern.pattern.test(classNameText)) {
        recordFinding(findings, sourceFile, node, legacyPattern.label);
      }
    }
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = getJsxTagName(node);
      const intrinsicLabel = tagName ? trackedIntrinsicTags.get(tagName) : undefined;
      if (intrinsicLabel && !allowIntrinsic) {
        recordFinding(findings, sourceFile, node, intrinsicLabel);
      }

      for (const property of node.attributes.properties) {
        if (!ts.isJsxAttribute(property)) {
          continue;
        }
        const attributeName = property.name.text;
        if (attributeName !== "className" && !attributeName.endsWith("ClassName")) {
          continue;
        }
        const classNameText = getClassNameText(property);
        inspectClassName(classNameText, property);
      }
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text.endsWith("ClassName")) {
      const classNameText = getStaticExpressionText(node.initializer);
      inspectClassName(classNameText, node);
    }

    if (ts.isPropertyAssignment(node)) {
      const propertyName = getPropertyNameText(node.name);
      if (propertyName === "className" || propertyName.endsWith("ClassName")) {
        const classNameText = getStaticExpressionText(node.initializer);
        inspectClassName(classNameText, node);
      }
    }

    if (
      ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left)
      && node.left.name.text === "className"
    ) {
      const classNameText = getStaticExpressionText(node.right);
      inspectClassName(classNameText, node);
    }

    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === "setAttribute"
      && node.arguments.length >= 2
      && ts.isStringLiteral(node.arguments[0])
      && (node.arguments[0].text === "class" || node.arguments[0].text === "className")
    ) {
      const classNameText = getStaticExpressionText(node.arguments[1]);
      inspectClassName(classNameText, node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

const sourceFiles = await fg(["**/*.ts", "**/*.tsx"], {
  cwd: sourceRoot,
  absolute: true,
  onlyFiles: true,
  ignore: ["routeTree.gen.ts"],
});

const findings = [];
for (const filePath of sourceFiles) {
  const sourceText = await ts.sys.readFile(filePath);
  if (sourceText == null) {
    continue;
  }
  const scriptKind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind);
  findings.push(...inspectSourceFile(sourceFile));
}

const groupedCounts = new Map();
for (const finding of findings) {
  groupedCounts.set(finding.label, (groupedCounts.get(finding.label) ?? 0) + 1);
}

for (const [label, count] of [...groupedCounts.entries()].sort(([left], [right]) => left.localeCompare(right, "zh-CN"))) {
  console.log(`${label}: ${count}`);
}

if (findings.length > 0 && !summaryOnly) {
  console.log("\n待迁移位置：");
  for (const finding of findings) {
    console.log(`${finding.file}:${finding.line} ${finding.label}`);
  }
}

if (strict && findings.length > 0) {
  throw new Error(`设计语言存量迁移尚未完成，共 ${findings.length} 处。`);
}

if (findings.length === 0) {
  console.log("设计语言存量迁移检查通过：业务组件直写模式已清零。");
}
