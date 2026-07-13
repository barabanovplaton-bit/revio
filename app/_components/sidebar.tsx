"use client";

import { useState } from "react";
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
  onOpenSettings?: () => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onPinProject: (id: string, pinned: boolean) => void;
  onArchiveProject: (id: string, archived: boolean) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
}

/** Разбивает текст на слова с индивидуальной задержкой появления. */
function StaggerText({
  text,
  visible,
  className,
}: {
  text: string;
  visible: boolean;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={cn("inline-flex flex-wrap", className)}>
      <AnimatePresence>
        {visible &&
          words.map((word, i) => (
            <motion.span
              key={`${word}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.18,
                delay: i * 0.04,
                ease: "easeOut",
              }}
              className="mr-1 whitespace-nowrap"
            >
              {word}
            </motion.span>
          ))}
      </AnimatePresence>
    </span>
  );
}

export function Sidebar({
  isAuthed,
  userName,
  userEmail,
  userPhoto,
  onSignInClick,
  onSignOut,
  onOpenSettings,
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

  return (
    <aside
      className="relative z-30 flex h-full shrink-0 flex-col border-r bg-bg-sidebar"
      style={{
        width: collapsed ? 72 : 220,
        transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onClick={(e) => {
        if (collapsed) {
          const target = e.target as HTMLElement;
          if (target === e.currentTarget || target.tagName === "DIV") {
            setCollapsed(false);
          }
        }
      }}
    >
      {/* Кнопка сворачивания — только когда РАЗВЁРНУТ, только на десктопе */}
      {!collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Свернуть панель"
          className={cn(
            "absolute top-4 z-40 hidden h-7 w-7 items-center justify-center rounded-full",
            "border bg-bg-card text-text-muted transition-all duration-150",
            "hover:text-text-primary hover:shadow-glow md:flex"
          )}
          style={{ right: -14 }}
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </button>
      )}

      {/* ====== ШАПКА: логотип + кнопка Новый проект ====== */}
      {/* Все элементы на одной X-координате (px-3), одинаковый размер h-9 w-9 */}
      <div className="shrink-0 px-3 pt-4 pb-3">
        {/* Логотип — всегда на месте, не двигается */}
        <div className="flex h-9 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-text-primary text-bg-page">
            <span className="font-display text-sm font-bold leading-none">R</span>
          </div>
          {/* Текст "Revio" — stagger по буквам */}
          <div className="overflow-hidden">
            <StaggerText
              text="Revio"
              visible={!collapsed}
              className="font-display text-base font-semibold tracking-tight text-text-primary"
            />
          </div>
        </div>

        {/* Кнопка Новый проект — та же X-координата, тот же размер иконки */}
        <div className="mt-2">
          {/* В развёрнутом: контурная кнопка с текстом */}
          <AnimatePresence mode="wait">
            {!collapsed && isAuthed ? (
              <motion.button
                key="new-expanded"
                type="button"
                onClick={onNewProject}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex h-9 w-full items-center gap-2.5 rounded-lg border border-border-strong bg-bg-input px-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-cardHover"
              >
                <PlusIcon className="h-4 w-4 shrink-0" />
                <StaggerText text="Новый проект" visible={!collapsed} />
              </motion.button>
            ) : collapsed && isAuthed ? (
              /* В свёрнутом: серая контурная кнопка (как в развёрнутом) */
              <motion.button
                key="new-collapsed"
                type="button"
                onClick={onNewProject}
                title="Новый проект"
                aria-label="Новый проект"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong bg-bg-input text-text-primary transition-all hover:bg-bg-cardHover active:scale-95 mx-auto"
              >
                <PlusIcon className="h-4 w-4" />
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* ====== СПИСОК ПРОЕКТОВ ====== */}
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
          <div className="px-1">
            {projects.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-text-muted whitespace-nowrap">
                {isAuthed
                  ? "Нет проектов"
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
          </div>
        )}
      </div>

      {/* ====== НИЗ: аватар или Попробовать бесплатно ====== */}
      <div className="shrink-0 p-2">
        {isAuthed ? (
          <Avatar
            name={userName}
            email={userEmail}
            photoURL={userPhoto}
            onSignInClick={onSignInClick}
            onSignOut={onSignOut}
            onOpenSettings={onOpenSettings}
            trailing={
              !collapsed ? (
                <div className="min-w-0 flex-1 overflow-hidden">
                  <StaggerText
                    text={userName || "Без имени"}
                    visible={!collapsed}
                    className="block truncate text-sm font-medium text-text-primary"
                  />
                  <StaggerText
                    text={userEmail || "Free план"}
                    visible={!collapsed}
                    className="block truncate text-xs text-text-muted"
                  />
                </div>
              ) : null
            }
          />
        ) : (
          // Не залогинен
          collapsed ? (
            // Свёрнутый: серая контурная круглая иконка (как Новый проект)
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onSignInClick}
                title="Попробовать бесплатно"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-bg-input text-text-primary transition-all hover:bg-bg-cardHover active:scale-95"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <AnimatePresence>
              <motion.button
                type="button"
                onClick={onSignInClick}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex h-9 w-full items-center justify-center rounded-lg bg-text-primary px-3 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <StaggerText text="Попробовать бесплатно" visible={!collapsed} />
              </motion.button>
            </AnimatePresence>
          )
        )}
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
