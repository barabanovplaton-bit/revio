"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { formatRelativeTime, type Project } from "@/lib/projects";

interface SidebarProps {
  isAuthed: boolean;
  userName?: string | null;
  userEmail?: string | null;
  userPhoto?: string | null;
  onSignInClick: () => void;
  onSignOut: () => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onPinProject: (id: string, pinned: boolean) => void;
  onArchiveProject: (id: string, archived: boolean) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
}

export function Sidebar({
  isAuthed,
  userName,
  userEmail,
  userPhoto,
  onSignInClick,
  onSignOut,
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onPinProject,
  onArchiveProject,
  onRenameProject,
  onDeleteProject,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Проекты: активные сверху, сданные ниже, архивные в самом низу
  // (сортировка уже сделана в subscribeToUserProjects)

  return (
    <aside
      className="relative z-30 flex h-full shrink-0 flex-col border-r bg-bg-sidebar"
      style={{
        width: collapsed ? 72 : 280,
        transition: "width 200ms ease-out",
      }}
    >
      {/* Кнопка сворачивания — ТОЛЬКО на десктопе */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
        className={cn(
          "absolute top-4 z-40 hidden h-8 w-8 items-center justify-center rounded-full",
          "border bg-bg-card text-text-muted transition-all duration-150",
          "hover:text-text-primary hover:shadow-glow md:flex"
        )}
        style={{ right: -16 }}
      >
        {collapsed ? (
          <ChevronRightIcon className="h-4 w-4" />
        ) : (
          <ChevronLeftIcon className="h-4 w-4" />
        )}
      </button>

      {/* Логотип + кнопка Новый проект */}
      <div className="shrink-0 px-3 pt-4 pb-3">
        {collapsed ? (
          // СВЁРНУТЫЙ (только десктоп): логотип + квадратная кнопка Новый проект
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-text-primary text-bg-page">
              <span className="font-display text-sm font-bold leading-none">R</span>
            </div>
            <button
              type="button"
              onClick={onNewProject}
              title="Новый проект"
              aria-label="Новый проект"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-strong bg-bg-input text-text-primary transition-all hover:bg-bg-cardHover active:scale-[0.95]"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        ) : (
          // РАЗВЁРНУТЫЙ: логотип + белая кнопка Новый проект
          <>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-text-primary text-bg-page">
                <span className="font-display text-sm font-bold leading-none">R</span>
              </div>
              <span className="overflow-hidden whitespace-nowrap font-display text-base font-semibold tracking-tight text-text-primary">
                Revio
              </span>
            </div>

            <button
              type="button"
              onClick={onNewProject}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-text-primary px-3 py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <PlusIcon className="h-4 w-4" />
              Новый проект
            </button>
          </>
        )}
      </div>

      {/* Список проектов */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-hide">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            {projects.slice(0, 12).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProject(p.id)}
                title={p.name}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all",
                  activeProjectId === p.id
                    ? "bg-bg-card"
                    : "hover:bg-bg-card opacity-80"
                )}
              >
                {p.icon || "📁"}
              </button>
            ))}
          </div>
        ) : (
          <>
            {projects.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-text-muted">
                {isAuthed
                  ? "Нет проектов. Создайте первый ↑"
                  : "Войдите, чтобы видеть проекты"}
              </div>
            ) : (
              <div className="space-y-0.5">
                {projects.map((p) => (
                  <ProjectItem
                    key={p.id}
                    project={p}
                    active={activeProjectId === p.id}
                    renaming={renaming === p.id}
                    renameValue={renameValue}
                    menuOpen={menuFor === p.id}
                    onSelect={() => onSelectProject(p.id)}
                    onMenuToggle={() =>
                      setMenuFor(menuFor === p.id ? null : p.id)
                    }
                    onRenameStart={() => {
                      setRenameValue(p.name);
                      setRenaming(p.id);
                      setMenuFor(null);
                    }}
                    onRenameChange={setRenameValue}
                    onRenameCommit={() => {
                      if (renaming && renameValue.trim()) {
                        onRenameProject(renaming, renameValue.trim());
                      }
                      setRenaming(null);
                    }}
                    onPin={() => {
                      onPinProject(p.id, !p.pinned);
                      setMenuFor(null);
                    }}
                    onArchive={() => {
                      onArchiveProject(p.id, !p.archived);
                      setMenuFor(null);
                    }}
                    onDelete={() => {
                      if (
                        confirm(
                          `Удалить проект «${p.name}» навсегда? Это действие нельзя отменить.`
                        )
                      ) {
                        onDeleteProject(p.id);
                      }
                      setMenuFor(null);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Профиль снизу */}
      <div
        className={cn(
          "shrink-0 border-t p-3",
          collapsed ? "flex justify-center px-4" : ""
        )}
      >
        <Avatar
          name={isAuthed ? userName : null}
          email={isAuthed ? userEmail : null}
          photoURL={isAuthed ? userPhoto : null}
          onSignInClick={onSignInClick}
          onSignOut={onSignOut}
          trailing={
            !collapsed ? (
              <div className="min-w-0 flex-1">
                {isAuthed ? (
                  <>
                    <div className="truncate text-sm font-medium text-text-primary">
                      {userName || "Без имени"}
                    </div>
                    <div className="truncate text-xs text-text-muted">
                      {userEmail || "Free план"}
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onSignInClick}
                    className="text-sm font-medium text-text-primary transition-colors hover:text-text-muted"
                  >
                    Войти
                  </button>
                )}
              </div>
            ) : null
          }
        />
      </div>
    </aside>
  );
}

/* ===== Карточка проекта в списке ===== */

function ProjectItem({
  project,
  active,
  renaming,
  renameValue,
  menuOpen,
  onSelect,
  onMenuToggle,
  onRenameStart,
  onRenameChange,
  onRenameCommit,
  onPin,
  onArchive,
  onDelete,
}: {
  project: Project;
  active: boolean;
  renaming: boolean;
  renameValue: string;
  menuOpen: boolean;
  onSelect: () => void;
  onMenuToggle: () => void;
  onRenameStart: () => void;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all",
          active ? "bg-bg-card" : "hover:bg-bg-card"
        )}
      >
        <span className="text-base leading-none shrink-0">
          {project.icon || "📁"}
        </span>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRenameCommit();
                if (e.key === "Escape") onRenameCommit();
              }}
              onBlur={onRenameCommit}
              autoFocus
              className="w-full rounded border border-border-strong bg-bg-input px-1.5 py-0.5 text-sm text-text-primary focus:outline-none"
            />
          ) : (
            <div
              className={cn(
                "truncate text-sm font-medium",
                active ? "text-text-primary" : "text-text-primary/90",
                project.status === "done" && "text-text-muted line-through"
              )}
            >
              {project.name}
            </div>
          )}
          <div className="truncate text-xs text-text-muted">
            {formatRelativeTime(project.updatedAt)}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenuToggle();
          }}
          className={cn(
            "shrink-0 rounded p-1 text-text-muted opacity-0 transition-all",
            "hover:bg-bg-cardHover hover:text-text-primary",
            "group-hover:opacity-100",
            menuOpen && "opacity-100"
          )}
          aria-label="Меню проекта"
        >
          <DotsIcon className="h-4 w-4" />
        </button>
      </button>

      {menuOpen && (
        <div className="absolute right-2 top-full z-50 mt-1 w-44 animate-slide-up rounded-xl border bg-bg-card p-1 shadow-xl">
          <button
            type="button"
            onClick={onPin}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
          >
            <PinIcon className="h-4 w-4" />
            {project.pinned ? "Открепить" : "Закрепить"}
          </button>
          <button
            type="button"
            onClick={onRenameStart}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
          >
            <EditIcon className="h-4 w-4" />
            Переименовать
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
          >
            <ArchiveIcon className="h-4 w-4" />
            {project.archived ? "Восстановить" : "В архив"}
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
          >
            <TrashIcon className="h-4 w-4" />
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}

/* ===== Иконки ===== */

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 17v5M5 12V7l4-4h6l4 4v5l-7 5z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
