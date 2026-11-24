import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  localizeNote,
  localizeProject,
  notes,
  profile,
  projects,
  type Note,
  type Project,
} from "./content";
import { categoryOptions, translate, type Language, type MessageKey } from "./i18n";

type Route = { page: "home" | "notes" | "projects" | "about" | "note" | "project" | "not-found"; slug?: string };
type ThemeChoice = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";
type SearchItem = { title: string; summary: string; type: string; kind: "note" | "project"; href: string; meta: string };

const NavigationContext = createContext<((path: string) => void) | null>(null);
const LocaleContext = createContext<Language>("zh");
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

function withBasePath(path: string) {
  if (!BASE_PATH || !path.startsWith("/") || path.startsWith("//")) return path;
  return `${BASE_PATH}${path === "/" ? "/" : path}`;
}

function getAppPathname(pathname: string) {
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return "/";
  return pathname.startsWith(`${BASE_PATH}/`) ? pathname.slice(BASE_PATH.length) : pathname;
}

function useLocale() {
  return useContext(LocaleContext);
}

function useT() {
  const language = useLocale();
  return (key: MessageKey, values?: Record<string, string | number>) => translate(language, key, values);
}

function useNavigate() {
  const navigate = useContext(NavigationContext);
  if (!navigate) throw new Error("NavigationContext is missing");
  return navigate;
}

function Link({
  href,
  className,
  children,
  onClick,
  ariaLabel,
  ariaCurrent,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  ariaCurrent?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <a
      href={withBasePath(href)}
      className={className}
      aria-label={ariaLabel}
      aria-current={ariaCurrent ? "page" : undefined}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.();
        if (
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          !event.currentTarget.target
        ) {
          event.preventDefault();
          navigate(href);
        }
      }}
    >
      {children}
    </a>
  );
}

function Icon({
  name,
  size = 18,
  strokeWidth = 1.7,
}: {
  name: "search" | "arrow" | "external" | "clock" | "calendar" | "close" | "github" | "menu" | "back" | "sun" | "moon" | "monitor" | "languages" | "home" | "note" | "projects" | "about";
  size?: number;
  strokeWidth?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 10h17" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    github: <><path d="M9 19c-4.3 1.3-4.3-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.7a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6s-1.2-.4-3.9 1.4a13.5 13.5 0 0 0-7.1 0C5 1.2 3.8 1.6 3.8 1.6a4.8 4.8 0 0 0-.1 3.6 5.2 5.2 0 0 0-1.4 3.6c0 5.2 3.1 6.4 6.1 6.7a3.4 3.4 0 0 0-.9 2.6V22" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />,
    monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    languages: <><path d="m5 8 6 6m-7 0 6-6 2-3M2 5h12M7 2v3m8 9 4-8 4 8m-6-2h4m-5 5 3-3 3 3" /></>,
    home: <><path d="M4 10.5 12 4l8 6.5V18.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M10 20.5v-5.5h4v5.5" /></>,
    note: <><path d="M5.5 4h7.5l5 5v11.5H5.5z" /><path d="M13 4v5h5" /><path d="M9 13h6.5M9 16.5h4.5" /></>,
    projects: <path d="M4 7.5a2 2 0 0 1 2-2h3.6a2 2 0 0 1 1.6.8l.9 1.2a2 2 0 0 0 1.6.8H18a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />,
    about: <><circle cx="12" cy="8" r="3.6" /><path d="M5.2 20.5a6.8 6.8 0 0 1 13.6 0" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function BrandMark() {
  return (
    <svg className="wordmark-symbol" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M24 7.5H13A4.5 4.5 0 0 0 8.5 12v8a4.5 4.5 0 0 0 4.5 4.5h11"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect className="wordmark-accent" x="22.4" y="14" width="4" height="4" />
    </svg>
  );
}

function parseRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { page: "home" };
  if (path === "/notes") return { page: "notes" };
  if (path === "/projects") return { page: "projects" };
  if (path === "/about") return { page: "about" };
  const noteMatch = path.match(/^\/notes\/([^/]+)$/);
  if (noteMatch) return { page: "note", slug: decodeURIComponent(noteMatch[1]) };
  const projectMatch = path.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) return { page: "project", slug: decodeURIComponent(projectMatch[1]) };
  return { page: "not-found" };
}

function Header({
  pathname,
  onSearch,
  language,
  onLanguageChange,
  resolvedTheme,
  onThemeChange,
}: {
  pathname: string;
  onSearch: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  resolvedTheme: "light" | "dark";
  onThemeChange: (theme: ThemeChoice) => void;
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 8);
  const links = [
    { href: "/", label: t("home"), icon: "home" as const },
    { href: "/notes", label: t("notes"), icon: "note" as const },
    { href: "/projects", label: t("projects"), icon: "projects" as const },
    { href: "/about", label: t("about"), icon: "about" as const },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="header-inner">
        <Link href="/" className="wordmark" ariaLabel={t("homeAccessible")}>
          <BrandMark />
          <span className="wordmark-name">
            <span className="wordmark-code">Code</span><span className="wordmark-liter">Liter</span>
          </span>
        </Link>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label={t("mainNavigation")}>
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${active ? "is-active" : ""}`}
                ariaLabel={link.label}
                ariaCurrent={active}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={link.icon} size={26} />
                <span className="nav-tooltip" aria-hidden="true">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="header-actions">
          <ThemeSwitch theme={resolvedTheme} onThemeChange={onThemeChange} />
          <button
            className="language-toggle"
            type="button"
            onClick={() => onLanguageChange(language === "zh" ? "en" : "zh")}
            aria-label={t("switchLanguage")}
            title={t("languageLabel")}
          >
            <span className="language-toggle-label">{language === "zh" ? "EN" : "中"}</span>
          </button>
          <button className="search-trigger" type="button" onClick={onSearch} aria-label={t("searchAccessible")}>
            <Icon name="search" size={17} />
            <span>{t("search")}</span>
            <kbd>⌘ K</kbd>
          </button>
          <button
            className="mobile-menu-button"
            type="button"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
      </div>
    </header>
  );
}

function ThemeSwitch({
  theme,
  onThemeChange,
}: {
  theme: ResolvedTheme;
  onThemeChange: (theme: ThemeChoice) => void;
}) {
  const t = useT();
  const isDark = theme === "dark";
  const currentLabel = t(isDark ? "themeDark" : "themeLight");
  return (
    <button
      className="theme-switch"
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`${t("themeLabel")}: ${currentLabel}`}
      title={`${t("themeLabel")}: ${currentLabel}`}
      onClick={() => onThemeChange(isDark ? "light" : "dark")}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <span className="theme-switch-thumb">
          <Icon name={isDark ? "moon" : "sun"} size={12} />
        </span>
      </span>
    </button>
  );
}

function Footer() {
  const t = useT();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link href="/" className="wordmark footer-wordmark">
          <BrandMark />
          <span className="wordmark-name">
            <span className="wordmark-code">Code</span><span className="wordmark-liter">Liter</span>
          </span>
        </Link>
        <p>{t("footerStatement")}</p>
        <span className="footer-copy">© 2026 CodeLiter</span>
      </div>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function NoteRow({ note, index }: { note: Note; index?: number }) {
  return (
    <Link href={`/notes/${note.slug}`} className="note-row">
      {index !== undefined && <span className="note-index">{String(index + 1).padStart(2, "0")}</span>}
      <div className="note-row-main">
        <div className="note-meta">
          <span className="category-label">{note.category}</span>
          <span className="meta-dot" aria-hidden="true">·</span>
          <span>{note.date}</span>
        </div>
        <h3>{note.title}</h3>
        <p>{note.summary}</p>
      </div>
      <div className="note-row-end">
        <span className="read-time"><Icon name="clock" size={14} />{note.readTime}</span>
        <span className="round-arrow" aria-hidden="true"><Icon name="arrow" size={16} /></span>
      </div>
    </Link>
  );
}

function ProjectCard({ project, compact = false }: { project: Project; compact?: boolean }) {
  return (
    <Link href={`/projects/${project.slug}`} className={`project-card ${compact ? "project-card-compact" : ""}`}>
      <div className={`project-art ${project.accent}`}>
        <div className="project-art-top">
          <span>{project.category}</span>
          <span className="project-status"><i aria-hidden="true" />{project.status}</span>
        </div>
        <div className="project-art-center">
          <span className="project-monogram">{project.name.slice(0, 1)}</span>
          <span className="project-art-line" />
          <span className="project-art-line short" />
        </div>
        <span className="project-art-number">0{projects.indexOf(project) + 1}</span>
      </div>
      <div className="project-card-content">
        <div className="project-card-title">
          <h3>{project.name}</h3>
          <Icon name="arrow" size={17} />
        </div>
        <p>{project.summary}</p>
        <div className="tag-list">
          {project.stack.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </div>
      </div>
    </Link>
  );
}

function HomePage({ onSearch }: { onSearch: () => void }) {
  const language = useLocale();
  const t = useT();
  const visibleNotes = notes.map((note) => localizeNote(note, language));
  const visibleProjects = projects.map((project) => localizeProject(project, language));
  return (
    <main>
      <section className="home-hero page-shell">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="status-dot" />{t("heroKicker")}</div>
          <h1>{t("heroTitle")}<br /><span>{t("heroTitleAccent")}</span></h1>
          <p className="hero-description">{t("heroDescription")}</p>
          <div className="hero-actions">
            <Link href="/notes" className="button button-dark">{t("browseNotes")} <Icon name="arrow" size={16} /></Link>
            <Link href="/projects" className="text-link">{t("seeProjects")} <Icon name="arrow" size={15} /></Link>
          </div>
          <div className="hero-footnote"><span>01 — 06</span><span>{t("heroFootnote")}</span></div>
        </div>
        <div className="hero-visual" aria-label={t("heroVisual")} role="img">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="code-window">
            <div className="window-toolbar">
              <div className="window-dots"><i /><i /><i /></div>
              <span>field-notes.md</span>
              <span className="window-edition">VOL. 01</span>
            </div>
            <div className="code-window-content">
              <div className="code-line"><span className="line-no">01</span><span className="code-muted">{t("editorHeading")}</span></div>
              <div className="code-line"><span className="line-no">02</span><span>&nbsp;</span></div>
              <div className="code-line"><span className="line-no">03</span><span><b>const</b> practice = {"{"}</span></div>
              <div className="code-line"><span className="line-no">04</span><span className="code-indent">learn: <em>"{t("learn")}",</em></span></div>
              <div className="code-line"><span className="line-no">05</span><span className="code-indent">build: <em>"{t("build")}",</em></span></div>
              <div className="code-line"><span className="line-no">06</span><span className="code-indent">share: <em>"{t("share")}"</em></span></div>
              <div className="code-line"><span className="line-no">07</span><span>{"}"}</span></div>
              <div className="code-line"><span className="line-no">08</span><span>&nbsp;</span></div>
              <div className="code-line"><span className="line-no">09</span><span className="code-comment">{t("editorComment")}</span></div>
            </div>
            <div className="window-footer"><span><i /> ALL SYSTEMS CURIOUS</span><span>{language === "zh" ? profile.location : profile.locationEn}</span></div>
          </div>
          <div className="floating-note"><span className="floating-note-index">NOTE NO. 014</span><span>{t("floatingNote").split("\n").map((line) => <span key={line}>{line}<br /></span>)}</span></div>
          <div className="hero-visual-caption"><span>FIG. 01</span><span>NOTES FROM THE BUILD</span></div>
        </div>
      </section>

      <section className="intro-strip page-shell">
        <span className="intro-mark"><BrandMark /></span>
        <p>{t("introStatement")}</p>
        <button className="intro-search" type="button" onClick={onSearch}>{t("explore")} <Icon name="arrow" size={15} /></button>
      </section>

      <section className="home-notes page-shell">
        <SectionHeading
          eyebrow="THE NOTEBOOK"
          title={t("recentNotes")}
          description={t("recentNotesDescription")}
          action={<Link href="/notes" className="section-link">{t("allNotes")} <Icon name="arrow" size={15} /></Link>}
        />
        <div className="note-list">
          {visibleNotes.slice(0, 3).map((note, index) => <NoteRow key={note.slug} note={note} index={index} />)}
        </div>
      </section>

      <section className="home-projects">
        <div className="page-shell">
          <SectionHeading
            eyebrow="SELECTED WORK"
            title={t("selectedWork")}
            description={t("selectedWorkDescription")}
            action={<Link href="/projects" className="section-link">{t("allProjects")} <Icon name="arrow" size={15} /></Link>}
          />
          <div className="project-grid">
            {visibleProjects.slice(0, 2).map((project) => <ProjectCard key={project.slug} project={project} />)}
          </div>
        </div>
      </section>

      <section className="about-teaser page-shell">
        <div className="about-teaser-label"><span className="eyebrow">{t("aboutLabel")}</span><span className="teaser-rule" /></div>
        <div className="about-teaser-copy">
          <h2>{t("aboutTeaserTitle", { name: language === "zh" ? profile.name : profile.englishName })}</h2>
          <p>{t("aboutTeaserDescription")}</p>
          <Link href="/about" className="text-link">{t("knowMore")} <Icon name="arrow" size={15} /></Link>
        </div>
        <div className="teaser-stamp"><span>STAY</span><span>CURIOUS</span><i>↗</i></div>
      </section>
    </main>
  );
}

function PageIntro({ eyebrow, title, description, aside }: { eyebrow: string; title: string; description: string; aside?: ReactNode }) {
  return (
    <section className="page-intro">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aside}
    </section>
  );
}

function ContentSearch({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const t = useT();
  return (
    <label className="content-search">
      <Icon name="search" size={18} />
      <span className="visually-hidden">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} />
      {value && <button type="button" className="clear-search" onClick={() => onChange("")} aria-label={t("clearSearch")}><Icon name="close" size={16} /></button>}
    </label>
  );
}

function FilterBar({
  categories,
  activeKey,
  onChange,
}: {
  categories: { key: MessageKey; label: string }[];
  activeKey: MessageKey;
  onChange: (category: MessageKey) => void;
}) {
  const t = useT();
  return (
    <div className="filter-bar" aria-label={t("filterByCategory")}>
      {categories.map((category) => (
        <button
          type="button"
          key={category.key}
          className={`filter-chip ${activeKey === category.key ? "is-selected" : ""}`}
          aria-pressed={activeKey === category.key}
          onClick={() => onChange(category.key)}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}

function NotesPage({ onSearch }: { onSearch: () => void }) {
  const language = useLocale();
  const t = useT();
  const categories = categoryOptions(language, "notes");
  const [categoryKey, setCategoryKey] = useState<MessageKey>("categoryAll");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 3;
  const selectedCategory = categories.find((category) => category.key === categoryKey)?.label;
  const localizedNotes = useMemo(() => notes.map((note) => localizeNote(note, language)), [language]);
  const filtered = useMemo(() => localizedNotes.filter((note) => {
    const categoryMatch = categoryKey === "categoryAll" || note.category === selectedCategory;
    const searchable = `${note.title} ${note.summary} ${note.category} ${note.tags.join(" ")}`.toLowerCase();
    return categoryMatch && searchable.includes(query.trim().toLowerCase());
  }), [categoryKey, localizedNotes, query, selectedCategory]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [categoryKey, query, language]);

  return (
    <main className="page-shell content-page">
      <PageIntro eyebrow="THE NOTEBOOK / 01" title={t("notes")} description={t("notesPageDescription")} aside={<div className="intro-count"><strong>{String(notes.length).padStart(2, "0")}</strong><span>{t("publishedNotes")}</span></div>} />
      <div className="listing-toolbar">
        <FilterBar categories={categories} activeKey={categoryKey} onChange={setCategoryKey} />
        <ContentSearch value={query} onChange={setQuery} label={t("searchNotes")} />
      </div>
      <div className="listing-summary" aria-live="polite">
        <span>{query || categoryKey !== "categoryAll" ? t("foundNotes", { count: filtered.length }) : t("noFilterNotes")}</span>
        <button type="button" className="summary-search-link" onClick={onSearch}>{t("quickSearch")} <span>⌘ K</span></button>
      </div>
      {visible.length > 0 ? (
        <div className="note-list notes-list-page">
          {visible.map((note, index) => <NoteRow key={note.slug} note={note} index={(page - 1) * pageSize + index} />)}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-mark">?</span>
          <h2>{t("noNoteTitle")}</h2>
          <p>{t("noNoteDescription")}</p>
          <button type="button" className="button button-outline" onClick={() => { setQuery(""); setCategoryKey("categoryAll"); }}>{t("clearFilters")}</button>
        </div>
      )}
      {pageCount > 1 && (
        <nav className="pagination" aria-label={t("notesPagination")}>
          <button type="button" className="pagination-arrow" disabled={page === 1} onClick={() => setPage((current) => current - 1)} aria-label={t("previousPage")}><Icon name="back" size={16} /></button>
          {Array.from({ length: pageCount }, (_, index) => (
            <button type="button" key={index} className={`pagination-page ${page === index + 1 ? "is-current" : ""}`} aria-current={page === index + 1 ? "page" : undefined} onClick={() => setPage(index + 1)}>{String(index + 1).padStart(2, "0")}</button>
          ))}
          <button type="button" className="pagination-arrow" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)} aria-label={t("nextPage")}><Icon name="arrow" size={16} /></button>
        </nav>
      )}
    </main>
  );
}

function ProjectsPage() {
  const language = useLocale();
  const t = useT();
  const categories = categoryOptions(language, "projects");
  const [categoryKey, setCategoryKey] = useState<MessageKey>("categoryAll");
  const selectedCategory = categories.find((category) => category.key === categoryKey)?.label;
  const localizedProjects = projects.map((project) => localizeProject(project, language));
  const filtered = localizedProjects.filter((project) => categoryKey === "categoryAll" || project.category === selectedCategory);
  return (
    <main className="page-shell content-page">
      <PageIntro eyebrow="THE WORKSHOP / 02" title={t("projects")} description={t("projectsPageDescription")} aside={<div className="intro-count"><strong>{String(projects.length).padStart(2, "0")}</strong><span>{t("practiceProjects")}</span></div>} />
      <div className="projects-toolbar">
        <FilterBar categories={categories} activeKey={categoryKey} onChange={setCategoryKey} />
        <span className="project-count">{t("projectsCountShort", { count: filtered.length })}</span>
      </div>
      <div className="project-grid project-grid-page">
        {filtered.map((project) => <ProjectCard key={project.slug} project={project} />)}
      </div>
      <div className="project-note"><span className="project-note-mark">↗</span><p>{t("projectNote")}</p></div>
    </main>
  );
}

function AboutPage() {
  const language = useLocale();
  const t = useT();
  const authorName = language === "zh" ? profile.name : profile.englishName;
  const interests = language === "zh" ? profile.interests : profile.interestsEn;
  return (
    <main className="page-shell content-page about-page">
      <PageIntro eyebrow="A LITTLE CONTEXT / 03" title={t("aboutPageTitle", { name: authorName })} description={t("aboutPageDescription")} />
      <div className="about-layout">
        <aside className="profile-card">
          <div className="profile-monogram">{language === "zh" ? profile.name.slice(0, 1) : profile.englishName.slice(0, 1)}</div>
          <div className="profile-name">{authorName}</div>
          <div className="profile-role">{language === "zh" ? profile.role : profile.roleEn}</div>
          <div className="profile-location"><span className="location-dot" />{language === "zh" ? profile.location : profile.locationEn}</div>
          <div className="profile-divider" />
          <span className="profile-label">{t("currentlyInto")}</span>
          <div className="profile-interests">{interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
          <a className="profile-email" href={`mailto:${profile.email}`}>{t("sendEmail")} <Icon name="external" size={15} /></a>
        </aside>
        <div className="about-story">
          <div className="eyebrow">{t("whyThisSpace")}</div>
          <h2>{t("aboutHeading").split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h2>
          <p>{t("aboutParagraphOne")}</p>
          <p>{t("aboutParagraphTwo")}</p>
          <div className="about-quote">{t("aboutQuote").split("\n").map((line) => <span key={line}>{line}<br /></span>)}</div>
          <div className="timeline">
            <div className="eyebrow">{t("thingsICareAbout")}</div>
            <div className="timeline-item"><span className="timeline-year">01</span><div><h3>{t("valueBoundary")}</h3><p>{t("valueBoundaryDescription")}</p></div></div>
            <div className="timeline-item"><span className="timeline-year">02</span><div><h3>{t("valueFeedback")}</h3><p>{t("valueFeedbackDescription")}</p></div></div>
            <div className="timeline-item"><span className="timeline-year">03</span><div><h3>{t("valueGrowth")}</h3><p>{t("valueGrowthDescription")}</p></div></div>
          </div>
        </div>
      </div>
    </main>
  );
}

function NoteDetail({ note }: { note: Note }) {
  const t = useT();
  return (
    <main className="page-shell detail-page">
      <Link href="/notes" className="back-link"><Icon name="back" size={16} />{t("backToNotes")}</Link>
      <article>
        <header className="article-header">
          <div className="note-meta"><span className="category-label">{note.category}</span><span className="meta-dot">·</span><span>{note.date}</span><span className="meta-dot">·</span><span>{note.readTime}{t("readingSuffix")}</span></div>
          <h1>{note.title}</h1>
          <p className="article-summary">{note.summary}</p>
          <div className="tag-list article-tags">{note.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        </header>
        <div className="article-layout">
          <aside className="article-aside">
            <div className="eyebrow">{t("articleContents")}</div>
            <nav aria-label={t("articleContents")}>
              {note.sections.map((section, index) => <a href={`#section-${index + 1}`} key={section.heading}>{String(index + 1).padStart(2, "0")} {section.heading}</a>)}
            </nav>
          </aside>
          <div className="article-body">
            <div className="article-lede">{note.summary}</div>
            {note.sections.map((section, index) => (
              <section className="article-section" id={`section-${index + 1}`} key={section.heading}>
                <h2><span>{String(index + 1).padStart(2, "0")}</span>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.code && <pre><code>{section.code}</code></pre>}
              </section>
            ))}
            <div className="article-end"><span>—</span><p>{t("thankYouForReading")}</p></div>
            <div className="article-next">
              <span className="eyebrow">{t("keepExploring")}</span>
              <Link href="/notes" className="text-link">{t("backToAllNotes")} <Icon name="arrow" size={15} /></Link>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}

function ProjectDetail({ project }: { project: Project }) {
  const t = useT();
  return (
    <main className="page-shell detail-page project-detail-page">
      <Link href="/projects" className="back-link"><Icon name="back" size={16} />{t("backToProjects")}</Link>
      <header className="project-detail-header">
        <div className={`project-detail-art ${project.accent}`}><span>{project.name.slice(0, 1)}</span><i>PROJECT / {project.category.toUpperCase()}</i></div>
        <div className="project-detail-copy">
          <div className="eyebrow">{project.category} · {project.date}</div>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
          <div className="project-status-line"><span className="location-dot" />{project.status}</div>
          <div className="tag-list project-detail-tags">{project.stack.map((item) => <span className="tag" key={item}>{item}</span>)}</div>
        </div>
      </header>
      <div className="project-detail-body">
        <div>
          <div className="eyebrow">{t("whatILearned")}</div>
          <h2>{t("projectDetailHeading").split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h2>
        </div>
        <div className="project-highlights">
          {project.highlights.map((highlight, index) => <div className="highlight-row" key={highlight}><span>0{index + 1}</span><p>{highlight}</p></div>)}
        </div>
      </div>
      <div className="project-next">
        <span className="eyebrow">{t("moreProjects")}</span>
        <Link href="/projects" className="text-link">{t("browseOtherProjects")} <Icon name="arrow" size={15} /></Link>
      </div>
    </main>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const language = useLocale();
  const t = useT();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const items: SearchItem[] = [
    ...notes.map((source) => {
      const note = localizeNote(source, language);
      return { title: note.title, summary: note.summary, type: t("noteType"), kind: "note" as const, href: `/notes/${note.slug}`, meta: `${note.category} · ${note.readTime}` };
    }),
    ...projects.map((source) => {
      const project = localizeProject(source, language);
      return { title: project.name, summary: project.summary, type: t("projectType"), kind: "project" as const, href: `/projects/${project.slug}`, meta: `${project.category} · ${project.status}` };
    }),
  ];
  const filtered = items.filter((item) => `${item.title} ${item.summary} ${item.meta}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="dialog-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        ref={dialogRef}
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
          );
          if (!focusable?.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="dialog-top">
          <span id="search-title" className="eyebrow">{t("searchDialogTitle")}</span>
          <button className="dialog-close" type="button" onClick={onClose} aria-label={t("closeSearch")}><Icon name="close" /></button>
        </div>
        <label className="dialog-input-wrap">
          <Icon name="search" size={21} />
          <span className="visually-hidden">{t("searchInputLabel")}</span>
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchInputPlaceholder")} />
          <kbd>ESC</kbd>
        </label>
        <div className="dialog-results" aria-live="polite">
          <div className="dialog-results-label">{query ? t("searchResultCount", { count: filtered.length }) : t("recentUpdates")}</div>
          {filtered.length ? filtered.map((item) => (
            <Link key={item.href} href={item.href} className="dialog-result" onClick={onClose}>
              <span className="result-type">{item.kind === "note" ? "N" : "P"}</span>
              <span className="result-copy"><strong>{item.title}</strong><small>{item.meta}</small></span>
              <Icon name="arrow" size={16} />
            </Link>
          )) : (
            <div className="dialog-empty"><strong>{t("noSearchResults")}</strong><span>{t("searchSuggestions")}</span></div>
          )}
        </div>
        <div className="dialog-footer"><span><kbd>↵</kbd> {t("selectResult")}</span><span><kbd>ESC</kbd> {t("close")}</span></div>
      </section>
    </div>
  );
}

function NotFound() {
  const t = useT();
  return (
    <main className="page-shell not-found">
      <span className="eyebrow">{t("notFoundEyebrow")}</span>
      <h1>{t("notFoundTitle").split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h1>
      <p>{t("notFoundDescription")}</p>
      <Link href="/" className="button button-dark"><Icon name="back" size={16} />{t("backHome")}</Link>
    </main>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(() => getAppPathname(window.location.pathname));
  const [searchOpen, setSearchOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() =>
    window.localStorage.getItem("codeliter-language") === "en" ? "en" : "zh",
  );
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    const storedTheme = window.localStorage.getItem("codeliter-theme");
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "system";
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const route = parseRoute(pathname);
  const navigate = (path: string) => {
    const url = new URL(withBasePath(path), window.location.origin);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setPathname(getAppPathname(url.pathname));
    setSearchOpen(false);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  useEffect(() => {
    const handlePopState = () => setPathname(getAppPathname(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemTheme(colorScheme.matches ? "dark" : "light");
    colorScheme.addEventListener("change", updateSystemTheme);
    return () => colorScheme.removeEventListener("change", updateSystemTheme);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      resolvedTheme === "dark" ? "#111114" : "#fafafa",
    );
    window.localStorage.setItem("codeliter-theme", theme);
  }, [theme, resolvedTheme]);

  useLayoutEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem("codeliter-language", language);
  }, [language]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if ((event.key === "/" && !isTyping) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const sourceNote = route.page === "note" ? notes.find((note) => note.slug === route.slug) : undefined;
  const sourceProject = route.page === "project" ? projects.find((project) => project.slug === route.slug) : undefined;
  const activeNote = sourceNote ? localizeNote(sourceNote, language) : undefined;
  const activeProject = sourceProject ? localizeProject(sourceProject, language) : undefined;

  useEffect(() => {
    const title = activeNote
      ? `${activeNote.title} — CodeLiter`
      : activeProject
        ? `${activeProject.name} — CodeLiter`
        : route.page === "notes"
          ? translate(language, "pageTitleNotes")
          : route.page === "projects"
            ? translate(language, "pageTitleProjects")
            : route.page === "about"
              ? translate(language, "pageTitleAbout")
              : translate(language, "pageTitleHome");
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      translate(language, "metaDescription"),
    );
  }, [activeNote, activeProject, language, route.page]);

  return (
    <NavigationContext.Provider value={navigate}>
      <LocaleContext.Provider value={language}>
        <div className="app">
          <a className="skip-link" href="#main-content">{translate(language, "skipToMain")}</a>
          <Header
            pathname={pathname}
            onSearch={() => setSearchOpen(true)}
            language={language}
            onLanguageChange={setLanguage}
            resolvedTheme={resolvedTheme}
            onThemeChange={setTheme}
          />
          <div id="main-content">
            {route.page === "home" && <HomePage onSearch={() => setSearchOpen(true)} />}
            {route.page === "notes" && <NotesPage onSearch={() => setSearchOpen(true)} />}
            {route.page === "projects" && <ProjectsPage />}
            {route.page === "about" && <AboutPage />}
            {route.page === "note" && (activeNote ? <NoteDetail note={activeNote} /> : <NotFound />)}
            {route.page === "project" && (activeProject ? <ProjectDetail project={activeProject} /> : <NotFound />)}
            {route.page === "not-found" && <NotFound />}
          </div>
          <Footer />
          {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
        </div>
      </LocaleContext.Provider>
    </NavigationContext.Provider>
  );
}
