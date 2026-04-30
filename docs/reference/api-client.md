
# API Client 约定

生成的 OpenAPI client 只负责发请求和返回后端响应，不承载前端缓存语义。

业务层读取可复用数据时，应通过 React Query 的统一缓存层访问；写请求更新本地缓存时，必须先确认后端业务成功。完整规则见 [服务端状态与缓存约定](../concepts/state-data.md)。
