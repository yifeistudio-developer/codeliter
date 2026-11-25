# 后端架构设计

## 目标与范围

后端采用 Node.js + TypeScript + Fastify + MongoDB 的模块化单体，为门户公开查询和管理员内容维护提供基础。目录和依赖方向遵循六边形架构（Ports and Adapters）：业务规则位于内层，HTTP 与数据库是可替换的外部适配器。当前接入笔记/项目公开查询、管理员会话、笔记写入与发布状态管理、项目登记维护和系统健康检查；论坛和媒体上传仍属于后续阶段。

运行环境要求 Node.js 26.13.1 或更高版本。

## 目录结构

```text
backend/
├── doc/
│   └── architecture.md
├── scripts/
│   ├── hash-admin-password.ts
│   └── migrations/
│       └── 001-create-content-indexes.ts
├── src/
│   ├── app/
│   │   ├── create-app.ts
│   │   └── create-app.test.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── application/admin-authentication-service.ts
│   │   │   ├── ports/
│   │   │   └── adapters/
│   │   │       ├── crypto/
│   │   │       ├── http/
│   │   │       └── persistence/
│   │   ├── notes/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── adapters/
│   │   │       ├── http/
│   │   │       └── persistence/
│   │   ├── projects/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── adapters/
│   │   │       ├── http/
│   │   │       └── persistence/
│   │   └── system/
│   │       ├── application/check-readiness.ts
│   │       ├── ports/readiness-probe.ts
│   │       └── adapters/http/system-routes.ts
│   ├── shared/config/env.ts
│   └── server.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## 依赖规则

依赖只能从外向内：

```text
HTTP / MongoDB adapters -> application use cases -> domain
                                      |
                                      +-> ports (interfaces)
MongoDB adapter -------------------------- implements ports
app/create-app.ts ------------------------ wires concrete adapters and use cases
```

- `domain` 定义业务概念和规则，不依赖 Fastify、MongoDB 或环境变量。
- `application` 实现用例，只依赖领域模型和端口接口。
- `ports` 描述用例所需的外部能力，例如 `NoteRepository`、`ReadinessProbe`。
- `adapters/http` 将 HTTP 请求映射为用例调用，并负责请求校验和响应序列化。
- `adapters/persistence` 通过 MongoDB Driver 实现端口，不把 MongoDB 文档类型泄漏到领域层。
- `app/create-app.ts` 是组合根，负责注入适配器；业务模块不得自行创建数据库连接或 Fastify 实例。

新增业务能力时，在对应模块中沿用 `domain / application / ports / adapters` 边界。模块之间通过公开用例或端口协作，不直接引用对方的持久化实现。

## 请求与数据流

以查询单篇公开笔记为例：

1. Fastify `note-routes` 校验 `slug` 并调用 `GetPublishedNote`。
2. 用例通过 `NoteRepository` 端口请求已发布笔记。
3. `MongoNoteRepository` 查询 `notes` 集合，强制筛选 `status: "published"`。
4. 持久化适配器把 BSON 文档映射为领域 `PublishedNote`。
5. HTTP 适配器将领域对象序列化为 JSON；不存在时返回 `NOTE_NOT_FOUND`。

MongoDB 连接在 `server.ts` 创建并注入。关闭 Fastify 服务时，连接通过 `onClose` hook 一并释放。健康检查分为存活检查和依赖就绪检查，便于部署平台区分进程状态与数据库连通性。

## HTTP 约定

- API 前缀为 `/api/v1`，使用 REST/JSON。
- `/api/v1` 响应统一为 `{ code, data?, msg?, trace_id }`：成功时 `code` 是小于 1024 的 HTTP 状态码；失败时 `code` 是大于 1024 的业务错误码，HTTP 状态仍由响应状态行表示，`msg` 是错误提示；`trace_id` 为 Fastify 请求 ID。健康检查端点不使用此封装。
- 业务错误码：1025 参数校验失败、1026 资源冲突、1027 服务器内部错误、1028 路由不存在、1029 来源不允许、1030 未认证、1031 登录凭据无效、1032 笔记不存在、1033 项目不存在。未映射的错误码按 `1024 + HTTP 状态码` 回退。
- JSON 对象中值为 `null` 的属性会在响应序列化时省略；数组中的 `null` 元素保留。
- `GET /api/v1/notes` 和 `GET /api/v1/projects` 使用 `index`、`size` 分页参数，`index` 从 1 开始，`size` 每页上限为 50；仅公开已发布内容。
- 笔记和项目分页响应的 `data` 为 `{ index, size, items }`，`index` 为从 1 开始的当前页索引，`size` 为分页大小；不返回总数。
- 管理接口成功删除资源以及登出均返回 200，响应 `data` 为空对象。
- `GET /api/v1/notes/:slug` 返回公开笔记；未找到时返回 404。
- 笔记列表可按 `categoryId`、`tagId`、`q` 和 `featured` 筛选；搜索覆盖标题、摘要和 Markdown 正文。
- `GET /api/v1/projects` 支持分页，并可按 `categoryId`、`stack`、`projectStatus`、`q` 和 `featured` 筛选。
- `GET /api/v1/projects/:slug` 返回公开项目详情，包含技术栈、实践亮点和可选代码/演示链接。
- 笔记和项目的列表、详情都只查询 `status: "published"` 的记录。
- `POST /api/v1/admin/session` 登录；`GET` 查询当前会话；`DELETE` 登出。
- 笔记管理：`GET/POST /api/v1/admin/notes`、`GET/PATCH/DELETE /api/v1/admin/notes/:slug`、`POST /api/v1/admin/notes/:slug/publish`、`POST /api/v1/admin/notes/:slug/unpublish`；新建为草稿，slug 创建后不可编辑。
- 项目管理：`GET/POST /api/v1/admin/projects`、`GET/PATCH/DELETE /api/v1/admin/projects/:slug`；登记后直接发布，slug 创建后不可编辑。
- 管理写请求必须通过管理员会话校验和 `ADMIN_ORIGIN` 精确来源校验。
- 管理登录按来源 IP 限流为 15 分钟最多 5 次；带凭据 CORS 仅允许 `ADMIN_ORIGIN`。
- `GET /health/live` 检查进程是否存活；`GET /health/ready` 检查 MongoDB 是否可用。
- Fastify JSON Schema 在边界校验输入；校验错误返回业务错误码 `1025` 和错误提示。
- 不向客户端暴露数据库异常、连接字符串或内部堆栈。

## MongoDB 约定

- 集合以业务名命名，例如 `notes`；文档主键使用 `ObjectId`。
- 业务文档和 MongoDB 专用类型仅在持久化适配器间转换。
- 笔记创建时默认为草稿，发布设置 `publishedAt`，撤销发布恢复为草稿；删除标记 `status: "deleted"`，不物理移除文档。
- 项目登记时直接发布；删除采用同样的软删除标记。slug 通过唯一索引保证唯一，更新接口不修改 slug。
- 笔记和项目列表按 `publishedAt`、`_id` 降序；搜索时优先按文本相关度排序。对应唯一、筛选、排序和文本索引由 `npm run db:migrate:content` 显式建立，应用启动不隐式修改数据库结构。
- `adminSessions` 保存随机会话令牌的 SHA-256 哈希和过期时间；唯一索引阻止令牌哈希重复，TTL 索引自动清理过期会话。
- 迁移脚本必须可重复执行（幂等）；新增迁移按序号命名并在设计文档中说明回滚/兼容策略。
- 公开查询始终在数据库过滤条件中限定已发布状态，不能只在 HTTP 层过滤草稿。

## 配置与安全

- 本地配置通过 `.env` 加载，示例见 `.env.example`；生产环境通过部署平台注入环境变量。
- 必填配置缺失或格式无效时，服务启动失败并输出明确错误。
- MongoDB URI 和数据库名通过 `MONGODB_URI`、`MONGODB_DB` 配置；认证凭据使用独立的 `MONGODB_USERNAME`、`MONGODB_PASSWORD`，`MONGODB_AUTH_SOURCE` 默认为 `admin`。用户名和密码必须同时配置，且不得同时把凭据嵌入 URI。
- Fastify 日志启用结构化输出；不得记录密码、Cookie、令牌或 MongoDB URI。
- 管理员邮箱与 scrypt 密码哈希由环境变量提供；会话 Cookie 设置 `HttpOnly`、`SameSite=Strict`，生产环境启用 `Secure`。
- Cookie 管理写操作要求 `Origin` 与 `ADMIN_ORIGIN` 完全一致，并仅允许配置的前端源进行 credentialed CORS。
- 密码生成命令为 `npm run admin:hash-password`；登录接口限制为每个 IP 每 15 分钟 5 次。
- 仅在应用位于可信反向代理后时启用 `TRUST_PROXY`，避免信任未经验证的转发头。

## 验证

```bash
npm test
npm run build
```

测试通过 Fastify `inject` 验证 HTTP 边界，不依赖运行中的 MongoDB。仓库/用例测试可继续使用端口替身，MongoDB 持久化适配器的集成测试应在需要时使用独立测试数据库。
