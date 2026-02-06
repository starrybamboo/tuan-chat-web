### 为什么需要自定义协议？(The "Why")

想象一下你的 React 应用在两种不同环境下的运行方式：

1.  **在 Web 服务器上 (Nginx):**

    * 当你在浏览器中访问 `http://your-domain.com/user/profile` 时，这个请求会发送到 Nginx 服务器。
    * Nginx 查看它的配置，发现 `try_files $uri $uri/ /index.html;` 这条规则。
    * 它首先尝试寻找一个叫做 `/user/profile` 的**文件**，找不到。然后尝试寻找一个叫 `/user/profile/` 的**Ŀ¼**，也找不到。
    * 最后，作为备选方案 (fallback)，它将服务器根目录下的 `index.html` 文件返回给浏览器。
    * 浏览器加载 `index.html`，里面的 React Router 代码开始执行，它看到 URL 是 `/user/profile`，于是就渲染出对应的用户个人资料组件。**整个过程，路由是由前端代码控制的。**

2.  **在 Electron 中 (默认方式 `loadFile`):**

    * Electron 不是一个 Web 服务器，它本质上是一个本地文件加载器。
    * 如果你用 `mainWindow.loadFile(path.resolve(__dirname, "../build/client/index.html"))` 启动应用，然后你的应用内部通过 React Router 尝试导航到 `/user/profile`。
    * Electron 会认为你想要加载一个**真实存在**的本地文件，它会去寻找路径 `.../build/client/user/profile`。
    * 这个文件当然是不存在的，所以 Electron 就会报错（通常是白屏或 404 错误）。

**核心矛盾**：Web 应用的路由是“虚拟”的，而 Electron 默认的文件加载方式是“物理”的。我们需要一座桥梁来连接这两种模式，**自定义协议 (`app://`) 就是这座桥梁**。

通过自定义协议，我们实际上是在 Electron 内部创建了一个\*\*“微型服务器”\*\*。我们自己可以编写逻辑，来决定如何响应任何以 `app://` 开头的请求，从而完美地模拟出 Nginx 的 `try_files` 行为。

-----

### 代码是如何工作的？(The "How")

现在我们来逐行解析 `main.js` 中的关键代码，看看它是如何搭建起这座“桥梁”的。

#### 1\. 注册协议: `protocol.registerSchemesAsPrivileged`

```javascript
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      secure: true, 
      standard: true, 
      supportFetchAPI: true, 
    },
  },
]);
```

* **作用**: 这是准备工作。在应用启动的最开始，我们就告诉 Electron：“嘿，我要创建一个名为 `app` 的新协议。请把它当作一个标准的、安全的协议来对待，就像 `http` 或 `file` 一样。”
* **`secure: true`**: 允许它访问一些需要安全上下文的 Web API。
* **`supportFetchAPI: true`**: 确保你可以在你的 React 代码中使用 `fetch` API 来请求 `app://` 协议下的资源。

#### 2\. 启动应用: `mainWindow.loadURL("app://./")`

```javascript
mainWindow.loadURL("app://./");
```

* **作用**: 这是应用的入口点。我们不再使用 `loadFile` 去加载一个物理文件，而是让浏览器窗口加载一个 URL。
* 这个 URL `app://./` 指向我们自定义协议的根目录。当 Electron 看到这个 URL 时，它不会去磁盘上寻找文件，而是会把这个请求交给下一步我们定义的处理器。

#### 3\. 定义协议的行为: `protocol.registerFileProtocol`

```javascript
protocol.registerFileProtocol("app", (request, callback) => {
    // ... 这里的代码就是我们的“微型服务器”核心逻辑
});
```

* **作用**: 这是最关键的部分。我们在这里定义了：**当收到任何 `app://` 协议的请求时，应该如何响应**。这个回调函数就是我们的请求处理器。

让我们看看处理器内部的逻辑：

```javascript
// 1. 解析请求路径
const url = request.url.substr("app://./".length);
const filePath = path.join(__dirname, "../build/client", url);

// 2. 检查路径状态
fs.stat(filePath, (err, stats) => {
    // 3. 备选方案 (Fallback)
    if (err) {
        // 如果路径不存在 (比如请求的是虚拟路由 /user/profile)
        // 我们就强制返回 index.html
        const indexPath = path.join(__dirname, "../build/client", "index.html");
        callback({ path: indexPath });
        return;
    }

    // 4. 处理目录请求
    if (stats.isDirectory()) {
        // 如果请求的是一个目录 (比如初始加载的 'app://./')
        // 我们就返回该目录下的 index.html
        const indexPath = path.join(filePath, "index.html");
        callback({ path: indexPath });
    } else {
        // 5. 处理文件请求
        // 如果请求的是一个真实的文件 (比如 main.js, style.css)
        // 我们就直接返回这个文件
        callback({ path: filePath });
    }
});
```

* **步骤 1 & 2**: 当收到一个请求（比如 `app://./assets/main.css`），我们先把它转换成一个完整的本地文件系统路径（比如 `C:\YourApp\build\client\assets\main.css`），然后用 `fs.stat` 检查这个路径。
* **步骤 3 (Fallback)**: `fs.stat` 如果返回错误 `err`，说明这个路径在磁盘上不存在。这完美对应了用户访问一个虚拟路由（如 `/user/profile`）的情况。此时，我们的代码会忽略用户请求的路径，**直接返回 `index.html` 的路径**。这和 Nginx 的 `try_files` 备选方案一模一样！
* **步骤 4 (Ŀ¼)**: 当应用初次加载 `app://./` 时，`filePath` 会指向 `.../build/client` 目录。`stats.isDirectory()` 会是 `true`，于是我们返回该目录下的 `index.html`。
* **步骤 5 (文件)**: 当 `index.html` 被加载后，它会请求 JS、CSS、图片等资源，例如 `app://./assets/main.css`。这时 `filePath` 指向一个真实存在的文件，`stats.isDirectory()` Ϊ `false`，于是我们就直接返回这个文件的路径。

### 总结

通过这三步，我们成功地在 Electron 内部实现了一个智能的请求处理器：

* **对于真实存在的文件（JS, CSS, 图片等），直接提供。**
* **对于不存在的路径（前端虚拟路由），统一返回 `index.html`，把路由控制权交还给 React Router。**

这套机制让你的 Electron 应用可以像一个真正的 Web 应用一样处理路由，为用户提供了无缝、一致的体验。