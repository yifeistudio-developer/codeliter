# CodeLiter 门户 MVP

基于 React、TypeScript 与 Vite 的独立前端原型，覆盖首页、学习笔记、项目实践、关于页及笔记/项目详情。

```bash
npm install
npm run dev
```

首页导航、分类筛选、笔记分页和站内搜索可交互；支持中文/English、明/暗/随系统主题，并保存访客偏好。`/`、`/notes`、`/notes/:slug`、`/projects`、`/projects/:slug` 与 `/about` 为公开路由。当前内容为本地演示数据，尚未连接技术方案中的 Fastify API；管理端与论坛不属于首期 MVP。

门户设计规范与信息架构见 [`proto/README.md`](./proto/README.md)。

## 部署到 GitHub Pages

仓库的 `.github/workflows/deploy-pages.yml` 会在 `main` 分支的前端文件变更时构建并发布站点，也可在 GitHub Actions 中手动运行。首次部署前，在仓库 **Settings → Pages → Build and deployment** 中将 **Source** 设为 **GitHub Actions**。发布使用 `/仓库名/` 子路径，并生成 `404.html` 以支持直接打开或刷新客户端路由。

当前部署的是使用本地演示数据的静态前端；后端和 MongoDB 尚未包含在此 workflow 中。
