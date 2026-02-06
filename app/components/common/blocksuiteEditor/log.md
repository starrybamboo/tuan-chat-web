
2025-12-30:新增`BaseEditor`组件:封装 `Blocksuite` 宿主挂载并提供初始化状态提示;完善`useBlocksuiteEditor`,清理时复位宿主节点并支持显式重载;补全类型定义:使用 `Blocksuite 官方 `Workspace/Doc/EditorContainer` 类型
2025-12-30:调整`Workspace`动态引入路径:切换至`@blocksuite/store/dist/workspace/index.js`兼容0.10.0版本导出

2025-12-30:修复`Workspace`导入与0.10.0初始化流程:改回从`@blocksuite/store`公开入口导入并按`Schema+Workspace+Page`初始化;使用`editor.page`替代`editor.doc`;handles由`doc`调整为`page`

2025-12-30:规避TS对`@blocksuite/store`具名导出的识别问题:运行时以`any`提取`Schema/Workspace`;handles中的`workspace/page`类型降级为`unknown`以消除`Page/Workspace`导出报错

2025-12-31:调整`BaseEditor`为“文档页”嵌入式布局:增加纸张容器(限宽/内边距/背景分层);通过scoped CSS隐藏默认`Title`与`Page info`区块,避免嵌入式场景UI过重

2025-12-31:接入Blocksuite自带所见即所得:在`useBlocksuiteEditor`中改为挂载`simple-affine-editor`,并在下一帧对内部`editor-container`启用`autofocus`与`page`ģʽ;handles.editor改为HTMLElement以兼容自带组件

2025-12-31:修复Slash菜单与标题样式:全局引入`@blocksuite/editor/themes/affine.css`以启用块级样式(如H1字号)与菜单样式;移除`BaseEditor`外层`overflow-hidden`避免弹出层被裁切;在内部`editor-container`清空`edgelessPreset`以移除画板模式入口

2025-12-31:重构为可扩展引擎结构:新增`engine.ts`抽离编辑器“挂载/配置/销毁”流程,支持`engine=simple|workspace`;扩展`BlocksuiteEditorOptions`支持`engine/mode/autofocus/disableEdgeless`;`useBlocksuiteEditor`改为显式组装并memo化mount参数,避免`options`对象导致的effect依赖不稳定;`BaseEditor`补充`variant/height/minHeight/hideTitle/hidePageInfo`等可配置项并适配React19的ref-as-prop写法

2025-12-31:新增内容转换工具(纯前端):在`blocksuiteEditor/utils/markdownHtml.ts`实现`markdownToHtml`与`htmlToMarkdown`双向转换(基于unified/remark/rehype,默认启用GFM并对HTML进行sanitize),用于后续Blocksuite导入导出与后端“纯文本存储”对接
