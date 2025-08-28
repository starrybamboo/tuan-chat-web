# 简介

这是团剧共创的前端项目。项目采用react作为框架，采用响应式界面设计。使用electron构建pc客户端，使用混合开发模式构建安卓客户端。基于webgal导出跑团replay。
## 在开始之前

### 安装依赖

```bash
pnpm install
```

#### electron安装问题
如果遇到
```
Electron failed to install correctly,
 please delete node_modules/electron and try installing again
```
尝试
```bash
node node_modules/electron/install.js
```

### 配置环境

在项目根目录创建 .env （或 .env.development)文件，把下面的文字粘贴进去。

```plain&#x20;text
VITE_API_BASE_URL=http://39.103.58.31:8081
VITE_API_WS_URL=ws://39.103.58.31:8090
VITE_TERRE_URL=http://localhost:3001
VITE_TERRE_WS=ws://localhost:3001/api/webgalsync
```

### IDE设置

#### Vscode 设置

仓库包含一个 `.vscode` 文件夹，其中包含设置。该设置会阻止默认的 `prettier` 扩展，并使用 `esLint` 进行保存时的格式化。格式化程序已在 `eslint.config.mjs` 文件中预先配置。请确保你已在 Vscode 中安装了 `eslint` 扩展。

**由于 Vscode 的限制，在你克隆仓库并安装依赖后，需要在终端中运行 `pnpm lint`以完成 eslint 的设置。**



#### Webstorm 设置

注意将设置中开启 `Run eslint --fix on save` 就可以，无需装别的插件（万一tailwind没提示就装一个tailwind的插件）。

![开启Run eslint --fix on save](https://ycn45b70r8yz.feishu.cn/space/api/box/stream/download/asynccode/?code=NmJlMTFkOWRmNTBlOWYxMTUxYzk1ZDhkM2Y5OGIyMDBfYUttUVd1TWtYcEVzQld6d3lZQlFHTGdqbnUzck5uclZfVG9rZW46TGF0aGJmdEtqb2F3V3h4cGkySGNpQ2ZYbmxnXzE3NTAwNzI1MDc6MTc1MDA3NjEwN19WNA)

### 启动！！！
```bash
pnpm dev
```

项目已预先配置了 `husky` 和 `lint-staged`，以便在每次提交前运行 lint。

如果因为 lint 错误而提交失败，可以运行以下命令修复错误：

```bash
pnpm lint:fix
```

这将对整个仓库进行 lint，修复 `eslint` 可修复的错误，并显示其余的错误。



## CI/CD 流程

自动化测试

自动部署（main分支会同步到http://47.119.147.6:84/)

# 文件架构

### core/\*\* ， models/\*\*，services/\*\*，

这些由openApi自动生成。

### useWebsocket.tsx

websocket的utils

### hooks/\*\* ，useQueryHooks.tsx

存放react-query相关的钩子函数。

如果要用react-query，请把新的钩子函数放在hooks文件夹下对应的文件内。

并且**一定要注意有没有已经定义好了的钩子函数，不要重复定义！**（ctrl+shift+f全局搜索一下）

并且mutation后记得invalidate对应的请求。

## ./app

### components

页面组件都放这里，按照大模块分类。common文件夹内放公用的组件。

### routes

对应路由的最终页面。

### updateLogs

存放更新日志（会以弹窗形式给用户看）

### webgal

webgal相关

### utils

存放各种工具类



## ./android

安卓客户端的工程文件夹，用android studio打开。使用混合开发模式。

# 依赖

### UI库

https://daisyui.com/

https://tailwindcss.com/

### Ahooks

阿里的钩子函数库，很实用。

https://ahooks.js.org/zh-CN/

### useHooks

同样是一个实用的钩子函数库。

https://usehooks.com/

### React-taost

用于发送通知

https://react-hot-toast.com/docs

![](https://ycn45b70r8yz.feishu.cn/space/api/box/stream/download/asynccode/?code=Y2ExMGJkYTUxMzBmM2YxZmZiYmY0ZTllNzQxYTQ0ZjhfRDYzVEZDVVB0eHAySUQ4aHV0ekt4TGxhcGZ5WVIzbHFfVG9rZW46Ull6dmIxdUpEb25yd0h4ZjFsMWNUcTdkbk5nXzE3NTAwNzI1MDc6MTc1MDA3NjEwN19WNA)

### eslint

修正格式。在每次commit的时候都会进行eslint的检查。如果检查不通过commit会失败。

如果你用的ide是webstorm，可以在这里打开eslint错误的自动修复：

![开启Run eslint --fix on save](https://ycn45b70r8yz.feishu.cn/space/api/box/stream/download/asynccode/?code=ZGNkMTEwMmQyZGYwYzhhMzdlMmNmNjk0MmEyZTZhZjdfYUFBVDYyT2RRemVmQ2tKenpsYTVmcXFQTThMTm1IdTlfVG9rZW46VXFZV2JZdFhGbzdwb1R4SEQ0UWM4cXJlblBnXzE3NTAwNzI1MDc6MTc1MDA3NjEwN19WNA)

### icon库

到这个网站上搜索后直接复制粘贴就行。

https://reactsvgicons.com/

### react-virtuoso

https://virtuoso.dev/

虚拟列表的轮子，但ahook中也提供了虚拟列表，可按情况选择



