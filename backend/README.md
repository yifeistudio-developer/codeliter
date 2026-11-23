# CodeLiter 后端

基于 Node.js、TypeScript、Fastify 和 MongoDB 的模块化单体，按六边形架构组织。当前包含健康检查、公开笔记和项目查询 API；完整架构边界与依赖规则见 [`doc/architecture.md`](./doc/architecture.md)。

## 本地运行

要求 Node.js 22 或更高版本及可连接的 MongoDB 实例。

```bash
npm install
cp .env.example .env
npm run admin:hash-password
npm run db:migrate:content
npm run dev
```

将密码哈希命令输出填入 `.env` 或 `.env.local` 的 `ADMIN_PASSWORD_HASH`，并设置 `ADMIN_EMAIL`、`ADMIN_ORIGIN`。密码不会以明文存入配置或数据库。MongoDB 不需要认证时，用户名和密码留空；需要认证时同时设置 `MONGODB_USERNAME`、`MONGODB_PASSWORD`，并按用户创建位置设置 `MONGODB_AUTH_SOURCE`（默认为 `admin`）。带特殊字符的密码请使用 dotenv 支持的引号包裹。服务仅允许配置的前端源进行带凭据 CORS；登录每个来源 IP 最多尝试 5 次/15 分钟。仅在请求经过可信反向代理时将 `TRUST_PROXY` 设为 `true`。

可通过 `GET /health/live` 检查进程状态、`GET /health/ready` 检查 MongoDB 连通性。

- 笔记：`GET /api/v1/notes`、`GET /api/v1/notes/:slug`。列表支持 `index`、`size`、`categoryId`、`tagId`、`q` 和 `featured`。
- 项目：`GET /api/v1/projects`、`GET /api/v1/projects/:slug`。列表支持 `index`、`size`、`categoryId`、`stack`、`projectStatus`、`q` 和 `featured`。

列表每页最多 50 条；列表和详情都只返回 `status: "published"` 的记录。运行 `npm run db:migrate:content` 初始化唯一、筛选、排序和文本搜索索引。

所有 `/api/v1` 响应使用 `{ code, data?, msg?, trace_id }` 格式：成功时 `code` 为 HTTP 状态码；失败时 `code` 为大于 1024 的业务错误码，`msg` 为错误提示，实际 HTTP 状态码仍通过 HTTP 响应状态表示。`trace_id` 用于关联请求。对象中值为 `null` 的属性会省略。分页请求参数为 `index`（从 1 开始）和 `size`；分页数据位于 `data` 中，格式为 `{ index, size, items }`。

管理接口使用 `POST /api/v1/admin/session` 登录，`GET` 查询会话，`DELETE` 登出。所有管理内容接口要求会话 Cookie 和匹配 `ADMIN_ORIGIN` 的 Origin：

- 笔记：`GET/POST /api/v1/admin/notes`、`GET/PATCH/DELETE /api/v1/admin/notes/:slug`、`POST /api/v1/admin/notes/:slug/publish`、`POST /api/v1/admin/notes/:slug/unpublish`。新笔记默认为草稿。
- 项目：`GET/POST /api/v1/admin/projects`、`GET/PATCH/DELETE /api/v1/admin/projects/:slug`。新项目登记后直接公开。

删除均为软删除；slug 创建后不可编辑，修改标题不会改变公开 URL。

## 常用命令

```bash
npm test
npm run build
npm start
```

配置项见 `.env.example`。后端会先加载 `.env.local`，再以 `.env` 补充；进程环境变量优先级最高。`.env.local` 已加入忽略规则，数据库 URI、用户名、密码和其他密钥不要提交到仓库。
