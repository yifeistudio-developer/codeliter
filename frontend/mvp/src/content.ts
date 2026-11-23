export type NoteSection = {
  heading: string;
  paragraphs: string[];
  code?: string;
};

type NoteFields = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  readTime: string;
  tags: string[];
  featured?: boolean;
  sections: NoteSection[];
};

export type Note = NoteFields & {
  translations?: { en?: Partial<Omit<NoteFields, "slug">> };
};

type ProjectFields = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  category: string;
  date: string;
  status: string;
  stack: string[];
  accent: string;
  highlights: string[];
  repo?: string;
  demo?: string;
};

export type Project = ProjectFields & {
  translations?: { en?: Partial<Omit<ProjectFields, "slug">> };
};

export function localizeNote(note: Note, language: "zh" | "en"): Note {
  return language === "en" ? { ...note, ...note.translations?.en } : note;
}

export function localizeProject(project: Project, language: "zh" | "en"): Project {
  return language === "en" ? { ...project, ...project.translations?.en } : project;
}

export const notes: Note[] = [
  {
    slug: "designing-modular-monolith",
    title: "从模块化单体开始：把复杂度留在该出现的地方",
    summary: "不是每个新产品都需要微服务。一次关于业务边界、协作成本与演进节奏的实践记录。",
    category: "架构设计",
    date: "2026.11.12",
    readTime: "8 分钟",
    tags: ["架构", "Spring Boot", "工程实践"],
    featured: true,
    sections: [
      {
        heading: "先让边界清晰，再考虑拆分",
        paragraphs: [
          "系统拆分的成本，通常比一张架构图里画出来的要高。对于处在早期的产品，把一个可部署单元里的模块边界设计清楚，往往比提前引入网络调用更重要。",
          "模块化单体并不是把所有代码放进同一个包，而是让内容、身份、项目等业务域拥有明确的职责和服务接口。",
        ],
      },
      {
        heading: "让模块之间通过接口协作",
        paragraphs: [
          "当一个模块需要另一个模块的数据时，先从稳定的服务契约开始。避免跨模块直接读写内部表，让边界在代码评审中也能被看见。",
        ],
        code: `interface NoteQueryService {
  fun findPublishedBySlug(slug: String): PublishedNote?
}`,
      },
      {
        heading: "什么时候值得拆分",
        paragraphs: [
          "当独立扩缩容、独立发布或团队自治成为真实需求时，再拆分模块会更有依据。好的架构不是预言未来，而是让下一次改变保持可控。",
        ],
      },
    ],
    translations: {
      en: {
        title: "Start with a Modular Monolith: Keep Complexity Where It Belongs",
        summary: "Not every new product needs microservices. A practical note on domain boundaries, collaboration costs, and the pace of evolution.",
        category: "Architecture",
        readTime: "8 min",
        tags: ["Architecture", "Spring Boot", "Engineering"],
        sections: [
          {
            heading: "Clarify boundaries before splitting",
            paragraphs: [
              "Splitting a system costs more than an architecture diagram suggests. Early products often benefit more from clear module boundaries inside one deployable unit than from introducing network calls too soon.",
              "A modular monolith is not a single package for everything. Content, identity, and projects still need clear responsibilities and service contracts.",
            ],
          },
          {
            heading: "Let modules collaborate through contracts",
            paragraphs: [
              "When one module needs another module's data, start with a stable service contract. Avoid reading and writing internal tables across boundaries so those boundaries remain visible in code review.",
            ],
            code: `interface NoteQueryService {
  fun findPublishedBySlug(slug: String): PublishedNote?
}`,
          },
          {
            heading: "Know when to split",
            paragraphs: [
              "Split a module when independent scaling, releases, or team ownership become real needs. Good architecture does not predict the future; it keeps the next change manageable.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "postgres-full-text-search",
    title: "用 PostgreSQL 全文检索，先把站内搜索做好",
    summary: "从标题、摘要到正文建立可维护的检索能力，不急着引入独立搜索服务。",
    category: "数据与检索",
    date: "2026.11.05",
    readTime: "6 分钟",
    tags: ["PostgreSQL", "搜索", "数据库"],
    sections: [
      {
        heading: "搜索从用户的任务开始",
        paragraphs: [
          "个人技术门户的首期搜索，目标是帮助访客找回一篇笔记或一个项目，而不是搭建通用搜索平台。明确范围有助于保持接口和索引简单。",
        ],
      },
      {
        heading: "把可搜索字段放在一起",
        paragraphs: [
          "索引标题、摘要和正文，并在结果中标注内容类型。列表采用稳定排序和分页，避免在内容增长后一次返回全部数据。",
        ],
        code: `SELECT title, summary
FROM note
WHERE status = 'PUBLISHED'
  AND search_vector @@ plainto_tsquery('simple', :query)
ORDER BY published_at DESC
LIMIT :page_size;`,
      },
      {
        heading: "按瓶颈演进",
        paragraphs: [
          "当数据量、相关性调优或索引更新延迟成为明确问题时，再评估独立搜索引擎。否则，维护好 PostgreSQL 的索引和查询计划就足够。",
        ],
      },
    ],
    translations: {
      en: {
        title: "PostgreSQL Full-Text Search: A Good First Search",
        summary: "Build maintainable search across titles, summaries, and body text without rushing into a standalone search service.",
        category: "Data & Search",
        readTime: "6 min",
        tags: ["PostgreSQL", "Search", "Database"],
        sections: [
          {
            heading: "Start with the user's task",
            paragraphs: [
              "The first search experience for a personal technology portal should help visitors find a note or project, not become a general-purpose search platform. A clear scope keeps the API and index simple.",
            ],
          },
          {
            heading: "Index the fields people search",
            paragraphs: [
              "Index titles, summaries, and body text, then identify the content type in each result. Use stable ordering and pagination rather than returning everything as content grows.",
            ],
            code: `SELECT title, summary
FROM note
WHERE status = 'PUBLISHED'
  AND search_vector @@ plainto_tsquery('simple', :query)
ORDER BY published_at DESC
LIMIT :page_size;`,
          },
          {
            heading: "Evolve when a bottleneck appears",
            paragraphs: [
              "Consider a dedicated search engine when data volume, relevance tuning, or index freshness becomes a real problem. Until then, well-maintained PostgreSQL indexes and query plans are often enough.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "markdown-content-pipeline",
    title: "Markdown 内容管线：从原文到安全的阅读体验",
    summary: "梳理 Markdown 存储、目录生成、代码高亮与外链安全之间的取舍。",
    category: "内容工程",
    date: "2026.10.28",
    readTime: "7 分钟",
    tags: ["Markdown", "内容系统", "安全"],
    sections: [
      {
        heading: "原文是内容资产",
        paragraphs: [
          "Markdown 让内容更容易迁移和版本化。将原文与渲染后的展示分开，既方便后续调整主题，也能保留内容源文件。",
        ],
      },
      {
        heading: "渲染阶段需要明确的安全边界",
        paragraphs: [
          "默认禁用未经净化的原始 HTML。链接协议、嵌入内容和代码高亮都应纳入渲染策略，而不是依赖作者每次手动检查。",
        ],
        code: `const renderOptions = {
  allowRawHtml: false,
  sanitizeLinks: true,
  headingAnchors: true,
};`,
      },
      {
        heading: "让长文易于浏览",
        paragraphs: [
          "根据标题结构生成目录，为代码块提供复制能力，并给长段落设置舒适的行长。阅读体验来自这些稳定的小决定。",
        ],
      },
    ],
    translations: {
      en: {
        title: "A Markdown Content Pipeline: From Source to Safe Reading",
        summary: "Trade-offs across Markdown storage, table-of-contents generation, code highlighting, and safe external links.",
        category: "Content Engineering",
        readTime: "7 min",
        tags: ["Markdown", "Content Systems", "Security"],
        sections: [
          {
            heading: "Treat source text as an asset",
            paragraphs: [
              "Markdown is easy to migrate and version. Keeping source text separate from its rendered presentation makes future theme changes easier while preserving the original content.",
            ],
          },
          {
            heading: "Define a security boundary at render time",
            paragraphs: [
              "Disable unsanitized raw HTML by default. Link protocols, embeds, and code highlighting all belong in the rendering policy instead of relying on authors to check every document manually.",
            ],
            code: `const renderOptions = {
  allowRawHtml: false,
  sanitizeLinks: true,
  headingAnchors: true,
};`,
          },
          {
            heading: "Make long-form writing easy to scan",
            paragraphs: [
              "Generate a table of contents from headings, offer copy controls for code blocks, and keep paragraph widths comfortable. Reading quality comes from these consistent details.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "react-url-state",
    title: "把筛选条件放进 URL：让内容列表可分享",
    summary: "搜索词、分类与分页状态应该可复制、可返回，也能被浏览器历史记录理解。",
    category: "前端实践",
    date: "2026.10.16",
    readTime: "5 分钟",
    tags: ["React", "URL", "用户体验"],
    sections: [
      {
        heading: "界面状态不只是组件状态",
        paragraphs: [
          "访客通过搜索和筛选找到内容后，通常希望把结果分享给别人。把查询条件序列化到 URL，可以让状态被复制、收藏和恢复。",
        ],
      },
      {
        heading: "从稳定的参数开始",
        paragraphs: [
          "先明确哪些条件值得分享，再选择简短、稳定的 query 参数。参数变化时同步更新页面和浏览器历史，同时保证返回键行为符合预期。",
        ],
        code: `const params = new URLSearchParams(location.search);
const category = params.get("category") ?? "全部";
const query = params.get("q") ?? "";`,
      },
      {
        heading: "设计好空状态",
        paragraphs: [
          "筛选没有结果时，保留用户输入，并给出清除筛选的明确入口。一个可恢复的空状态比单纯显示零条结果更有帮助。",
        ],
      },
    ],
    translations: {
      en: {
        title: "Put Filters in the URL to Make Content Shareable",
        summary: "Search, category, and pagination state should be easy to copy, revisit, and understand through browser history.",
        category: "Frontend",
        readTime: "5 min",
        tags: ["React", "URLs", "UX"],
        sections: [
          {
            heading: "UI state is more than component state",
            paragraphs: [
              "After finding something through search and filters, visitors often want to share the result. Serializing useful query state into the URL makes it easy to copy, bookmark, and restore.",
            ],
          },
          {
            heading: "Start with stable parameters",
            paragraphs: [
              "Decide which filters are worth sharing, then choose short, stable query parameters. Keep the page in sync with browser history so the back button behaves as expected.",
            ],
            code: `const params = new URLSearchParams(location.search);
const category = params.get("category") ?? "All";
const query = params.get("q") ?? "";`,
          },
          {
            heading: "Design a useful empty state",
            paragraphs: [
              "When filters return no results, keep the query visible and offer a clear way to reset it. A recoverable empty state is more useful than a bare zero-result message.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "small-team-release-checklist",
    title: "小团队发布清单：减少上线前的临时决定",
    summary: "把迁移、回滚、配置和关键路径验证变成可以复用的发布习惯。",
    category: "工程实践",
    date: "2026.10.03",
    readTime: "4 分钟",
    tags: ["发布", "可靠性", "团队协作"],
    sections: [
      {
        heading: "发布是一条可重复的路径",
        paragraphs: [
          "每次发布都重新决定数据库迁移顺序和回滚方式，会让简单变更也变得紧张。轻量的清单能把注意力留给真正特殊的部分。",
        ],
      },
      {
        heading: "先验证关键路径",
        paragraphs: [
          "在预发布环境检查首页、内容详情和搜索等公开路径，再确认后台写操作的授权边界。迁移与应用版本也要保持兼容。",
        ],
      },
      {
        heading: "记录结果，而不是流程噪音",
        paragraphs: [
          "发布记录应包含变更、验证结果和需要关注的指标。出问题时，这些信息能帮助团队快速判断并恢复。",
        ],
      },
    ],
    translations: {
      en: {
        title: "A Small-Team Release Checklist: Fewer Last-Minute Decisions",
        summary: "Turn migrations, rollbacks, configuration, and critical-path checks into repeatable release habits.",
        category: "Engineering",
        readTime: "4 min",
        tags: ["Release", "Reliability", "Collaboration"],
        sections: [
          {
            heading: "Make releases repeatable",
            paragraphs: [
              "Re-deciding migration order and rollback strategy for every release makes even small changes stressful. A lightweight checklist leaves attention for the truly unusual parts.",
            ],
          },
          {
            heading: "Verify the critical paths first",
            paragraphs: [
              "Check public paths such as the home page, content details, and search in staging, then verify authorization on write operations. Keep migrations compatible with the application version.",
            ],
          },
          {
            heading: "Record outcomes, not process noise",
            paragraphs: [
              "Release notes should capture what changed, what was verified, and which signals need attention. When something goes wrong, this helps the team respond and recover quickly.",
            ],
          },
        ],
      },
    },
  },
];

export const projects: Project[] = [
  {
    slug: "codeliter-portal",
    name: "CodeLiter 技术实践门户",
    summary: "把学习笔记、项目实践与技术复盘，整理成一个可持续生长的个人知识入口。",
    description:
      "一个内容优先的个人技术门户原型。首期专注稳定内容链接、分类标签、站内搜索与项目展示，后端采用模块化单体逐步接入。",
    category: "个人产品",
    date: "2026.11",
    status: "持续迭代",
    stack: ["React", "TypeScript", "Spring Boot", "PostgreSQL"],
    accent: "project-pink",
    highlights: ["内容按领域分类，笔记与项目拥有独立模型", "轻量搜索支持关键词与分类组合", "为后端 API 与内容管理预留清晰边界"],
    repo: "https://github.com/",
    demo: "/",
    translations: {
      en: {
        name: "CodeLiter Technical Portal",
        summary: "A growing home for learning notes, project work, and engineering retrospectives.",
        description: "A content-first portal prototype. The first release focuses on stable links, categories, tags, search, and project stories, with a modular monolith planned for the backend.",
        category: "Indie Product",
        status: "In progress",
        highlights: ["Separate note and project models by domain", "Lightweight search combines keywords and categories", "Clear boundaries for a future API and content editor"],
      },
    },
  },
  {
    slug: "reading-notes-api",
    name: "Reading Notes API",
    summary: "一组围绕可发布笔记、标签和全文搜索设计的内容 API 实验。",
    description:
      "以 Kotlin 和 Spring Boot 验证内容模块边界，探索草稿与发布状态、Markdown 原文存储和全文检索的组合方式。",
    category: "后端服务",
    date: "2026.09",
    status: "原型验证",
    stack: ["Kotlin", "Spring Boot", "PostgreSQL", "Flyway"],
    accent: "project-blue",
    highlights: ["公开查询仅返回已发布内容", "slug 保持稳定并可独立维护", "通过版本化迁移管理数据库结构"],
    repo: "https://github.com/",
    translations: {
      en: {
        summary: "A content API experiment around published notes, tags, and full-text search.",
        description: "An exploration of content boundaries with Kotlin and Spring Boot, including draft and publish states, Markdown source storage, and full-text search.",
        category: "Backend",
        status: "Prototype",
        highlights: ["Public queries return published content only", "Stable slugs can be managed independently", "Versioned migrations keep the schema under control"],
      },
    },
  },
  {
    slug: "tiny-release-notes",
    name: "Tiny Release Notes",
    summary: "将零散提交整理为清晰、可检索的版本变更记录。",
    description:
      "一个小型的工程效率工具实验，帮助个人项目维护者把提交信息转化成结构化、可分享的发布说明。",
    category: "开发工具",
    date: "2026.07",
    status: "已完成",
    stack: ["TypeScript", "Node.js", "Markdown"],
    accent: "project-green",
    highlights: ["支持按版本归档变更", "输出便于提交和分享的 Markdown", "保持无数据库的轻量工作流"],
    repo: "https://github.com/",
    translations: {
      en: {
        summary: "Turn scattered commits into clear, searchable release notes.",
        description: "A small developer-tool experiment that turns commit messages into structured, shareable release notes for independent projects.",
        category: "Developer Tools",
        status: "Completed",
        highlights: ["Organize changes by release", "Export Markdown ready to commit or share", "Keep a lightweight workflow without a database"],
      },
    },
  },
];

export const profile = {
  name: "弘毅",
  englishName: "Hongyi",
  role: "独立开发者 · 终身学习者",
  roleEn: "Independent developer · lifelong learner",
  bio: "记录技术选择背后的原因，也分享把想法一步步做出来的过程。",
  bioEn: "Sharing the reasons behind technical decisions and the process of bringing ideas to life.",
  location: "杭州 · 中国",
  locationEn: "Hangzhou · China",
  email: "hello@codeliter.dev",
  interests: ["系统设计", "开发者体验", "内容系统", "独立产品"],
  interestsEn: ["System Design", "Developer Experience", "Content Systems", "Indie Products"],
};
