"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime, type Project } from "@/lib/projects";

interface CanvasProps {
  isAuthed: boolean;
  projects: Project[];
  activeProjectId: string | null;
  onSignIn: () => void;
  onSignUp: () => void;
  onNewProject: () => void;
  onSelectProject: (id: string) => void;
}

export function Canvas({
  isAuthed,
  projects,
  activeProjectId,
  onSignIn,
  onSignUp,
  onNewProject,
  onSelectProject,
}: CanvasProps) {
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return projects;
    const q = query.toLowerCase();
    return projects.filter((p) =>
      [p.name, p.description || "", p.clientName || ""].some((s) =>
        s.toLowerCase().includes(q)
      )
    );
  }, [projects, query]);

  // Не залогинен → экран входа
  if (!isAuthed) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-3 font-display text-3xl font-semibold tracking-tight text-text-primary">
            Revio
          </h1>
          <p className="mb-10 text-sm text-text-muted">
            Правки без хаоса в WhatsApp и Telegram
          </p>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onSignUp}
              className={cn(
                "w-full rounded-xl bg-text-primary px-5 py-3.5",
                "text-sm font-medium text-bg-page",
                "transition-all duration-150",
                "hover:opacity-90 active:scale-[0.98]"
              )}
            >
              Зарегистрироваться
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className={cn(
                "w-full rounded-xl border border-border-strong bg-bg-input px-5 py-3.5",
                "text-sm font-medium text-text-primary",
                "transition-all duration-150",
                "hover:bg-bg-cardHover active:scale-[0.98]"
              )}
            >
              Войти
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Залогинен, режим поиска → поиск + список проектов
  if (searchMode) {
    return (
      <div className="flex h-full flex-col">
        {/* Поисковая строка */}
        <div className="shrink-0 border-b bg-bg-sidebar px-4 py-3 md:px-8 md:py-4">
          <div className="mx-auto max-w-3xl">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск проектов..."
                autoFocus
                className="w-full rounded-xl border bg-bg-input py-2.5 pl-10 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearchMode(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>

        {/* Результаты */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-4 md:px-8 md:py-6">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-text-muted">
                {query
                  ? `Ничего не нашлось по запросу «${query}»`
                  : "У вас пока нет проектов"}
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProject(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border bg-bg-card px-4 py-3 text-left transition-all",
                      "hover:border-border-strong hover:bg-bg-cardHover",
                      activeProjectId === p.id && "border-text-primary"
                    )}
                  >
                    <span className="text-xl shrink-0">{p.icon || "📁"}</span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate text-sm font-medium text-text-primary",
                          p.status === "done" && "text-text-muted line-through"
                        )}
                      >
                        {p.name}
                      </div>
                      {p.description && (
                        <div className="truncate text-xs text-text-muted">
                          {p.description}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-xs text-text-subtle">
                      {formatRelativeTime(p.updatedAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Залогинен, нет проекта → главный экран с кнопками
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-3 font-display text-3xl font-semibold tracking-tight text-text-primary">
          С чего начнём?
        </h1>
        <p className="mb-10 text-sm text-text-muted">
          Создайте новый проект — бриф, правки и приёмка в одном месте
        </p>
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onNewProject}
            className={cn(
              "w-full rounded-xl bg-text-primary px-5 py-3.5",
              "text-sm font-medium text-bg-page",
              "transition-all duration-150",
              "hover:opacity-90 active:scale-[0.98]"
            )}
          >
            + Создать новый проект
          </button>
          {projects.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchMode(true)}
              className={cn(
                "w-full rounded-xl border border-border-strong bg-bg-input px-5 py-3.5",
                "text-sm font-medium text-text-primary",
                "transition-all duration-150",
                "hover:bg-bg-cardHover active:scale-[0.98]"
              )}
            >
              Поиск проектов
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
