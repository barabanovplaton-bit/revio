"use client";

import { useState, useMemo } from "react";
import {
  DEMO_PROJECTS,
  formatRelativeTime,
  PROJECT_STATUS_LABEL,
  type Project,
} from "../_lib/demo-data";
import { cn } from "@/lib/utils";

interface ProjectsPageProps {
  onNewProject: () => void;
  onOpenProject: (id: string) => void;
}

export function ProjectsPage({ onNewProject, onOpenProject }: ProjectsPageProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEMO_PROJECTS;
    return DEMO_PROJECTS.filter((p) =>
      [p.name, p.description || ""].some((s) => s.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-14">
      {/* Заголовок + кнопка Новый проект */}
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary">
            Мои проекты
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {DEMO_PROJECTS.length}{" "}
            {DEMO_PROJECTS.length === 1 ? "проект" : "проектов"}
          </p>
        </div>
        <button
          type="button"
          onClick={onNewProject}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-xl bg-text-primary px-4 py-2.5",
            "text-sm font-medium text-bg-page transition-all duration-150",
            "hover:opacity-90 active:scale-[0.98]"
          )}
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Новый проект</span>
          <span className="sm:hidden">Новый</span>
        </button>
      </header>

      {/* Поиск */}
      <div className="mb-8">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию или описанию..."
            className={cn(
              "w-full rounded-xl border bg-bg-input py-2.5 pl-10 pr-10",
              "text-sm text-text-primary placeholder:text-text-muted",
              "transition-colors focus:border-border-strong focus:outline-none"
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary"
              aria-label="Очистить"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Единый список проектов (без деления на активные/архив) */}
      <section>
        {filtered.length === 0 ? (
          <EmptyState query={query} onNewProject={onNewProject} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => onOpenProject(p.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ===== Карточка проекта ===== */

function ProjectCard({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  const statusColor = getStatusColor(project.status);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-bg-card p-5 text-left",
        "transition-all duration-200",
        "hover:border-border-strong hover:bg-bg-cardHover",
        "hover:-translate-y-0.5",
        project.archived && "opacity-60"
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-bg-input text-text-muted">
          <TypeIcon type={project.type} />
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-xs text-text-muted">
            {PROJECT_STATUS_LABEL[project.status]}
          </span>
        </div>
      </div>

      <div className="mb-4 min-w-0">
        <h3 className="truncate font-medium text-text-primary">
          {project.name}
        </h3>
        {project.description && (
          <p className="mt-1 line-clamp-2 text-sm text-text-muted">
            {project.description}
          </p>
        )}
      </div>

      {/* Только время — без кругов правок */}
      <div className="mt-auto flex items-center justify-end border-t pt-3 text-xs text-text-subtle">
        <span>{formatRelativeTime(project.updatedAt)}</span>
      </div>
    </button>
  );
}

/* ===== Пустое состояние ===== */

function EmptyState({
  query,
  onNewProject,
}: {
  query: string;
  onNewProject: () => void;
}) {
  if (query) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
        <div className="mb-3 text-text-muted">
          <SearchIcon className="h-8 w-8" />
        </div>
        <p className="text-sm text-text-primary">
          Ничего не нашлось по запросу «{query}»
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Попробуйте изменить запрос или создайте новый проект
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border bg-bg-card text-text-muted">
        <FolderIcon className="h-6 w-6" />
      </div>
      <p className="text-base font-medium text-text-primary">
        Пока нет ни одного проекта
      </p>
      <p className="mt-1 mb-5 text-sm text-text-muted">
        Создайте первый проект, чтобы отправить клиенту ссылку на бриф или правки
      </p>
      <button
        type="button"
        onClick={onNewProject}
        className="flex items-center gap-2 rounded-xl bg-text-primary px-4 py-2.5 text-sm font-medium text-bg-page transition-opacity hover:opacity-90"
      >
        <PlusIcon className="h-4 w-4" />
        Создать проект
      </button>
    </div>
  );
}

/* ===== Утилиты ===== */

/**
 * Контрастные цвета статусов.
 * Подобраны так, чтобы быть различимыми даже в чёрно-белой палитре:
 *  - brief    — мягкий жемчужно-серый (старт)
 *  - revisions — чистый белый (активная работа, самый яркий)
 *  - review   — нейтрально-серый (на рассмотрении)
 *  - done     — тёмный (завершено)
 */
function getStatusColor(status: Project["status"]): string {
  switch (status) {
    case "brief":
      return "#9CA3AF"; // светлый серый
    case "revisions":
      return "#FFFFFF"; // белый — активный
    case "review":
      return "#6B6B6B"; // средний серый
    case "done":
      return "#3A3A3A"; // тёмный
  }
}

function TypeIcon({ type }: { type: Project["type"] }) {
  if (type === "image") return <ImageIcon className="h-5 w-5" />;
  if (type === "video") return <VideoIcon className="h-5 w-5" />;
  return <GlobeIcon className="h-5 w-5" />;
}

/* ===== Иконки ===== */

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path d="m17 10 4-2v8l-4-2" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
    </svg>
  );
}
