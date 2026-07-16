"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon } from "./_components/bell-icon";
import { Avatar } from "./_components/avatar";
import { NewProjectModal } from "./_components/new-project-modal";
import { signOut, subscribeToAuth, type User } from "@/lib/auth";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";
import {
  subscribeToUserProjects,
  updateProject,
  togglePin,
  toggleArchive,
  deleteProject,
  formatRelativeTime,
  type Project,
} from "@/lib/projects";

export default function Page() {
  return <App />;
}

function App() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hasNotifications] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const goToLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  useEffect(() => {
    const unsub = subscribeToAuth(async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
        setProjects([]);
        setActiveProjectId(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }
    const unsub = subscribeToUserProjects(user.uid, (list) => {
      setProjects(list);
    });
    return () => unsub();
  }, [user]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    showToast("Вы вышли");
  }, [showToast]);

  const handleNewProject = useCallback(() => {
    if (!user) {
      goToLogin();
      return;
    }
    setNewProjectOpen(true);
  }, [user, goToLogin]);

  const handleSelectProject = useCallback(
    (id: string) => {
      if (!user) {
        goToLogin();
        return;
      }
      setActiveProjectId(id);
    },
    [user, goToLogin]
  );

  const handleProjectCreated = useCallback(
    (id: string) => {
      setNewProjectOpen(false);
      setActiveProjectId(id);
      showToast("Проект создан");
    },
    [showToast]
  );

  const handleRenameProject = useCallback(
    async (id: string, name: string) => {
      await updateProject(id, { name });
      showToast("Переименовано");
    },
    [showToast]
  );

  const handlePinProject = useCallback(async (id: string, pinned: boolean) => {
    await togglePin(id, pinned);
  }, []);

  const handleArchiveProject = useCallback(
    async (id: string, archived: boolean) => {
      await toggleArchive(id, archived);
      if (activeProjectId === id) setActiveProjectId(null);
      showToast(archived ? "В архиве" : "Восстановлено");
    },
    [activeProjectId, showToast]
  );

  const handleDeleteProject = useCallback(
    async (id: string) => {
      await deleteProject(id);
      if (activeProjectId === id) setActiveProjectId(null);
      showToast("Проект удалён");
    },
    [activeProjectId, showToast]
  );

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="flex h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  if (activeProjectId && user) {
    return (
      <ProjectView
        projectId={activeProjectId}
        ownerUid={user.uid}
        onBack={() => setActiveProjectId(null)}
        onProjectDeleted={() => setActiveProjectId(null)}
      />
    );
  }

  const filtered = query.trim()
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : projects;

  const activeProjects = filtered.filter((p) => !p.archived);
  const archivedProjects = filtered.filter((p) => p.archived);

  return (
    <div className="flex min-h-screen flex-col bg-bg-page">
      {/* Floating header */}
      <div className="sticky top-0 z-20 px-4 pt-3 md:px-6">
        <header className="mx-auto flex max-w-3xl items-center justify-between rounded-2xl border border-border-strong bg-bg-card px-5 py-3 shadow-lg">
          {/* Лого — левый край */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-text-primary text-bg-page">
              <span className="font-display text-xs font-bold">R</span>
            </div>
            <span className="font-display text-lg font-semibold text-text-primary">
              Revio
            </span>
          </div>

          {/* Правый край: колокольчик + аватар */}
          <div className="flex items-center gap-1">
            {user && (
              <button
                type="button"
                onClick={() => router.push("/notifications")}
                className="relative rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
                aria-label="Уведомления"
              >
                <BellIcon className="h-5 w-5" />
                {hasNotifications && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
            )}
            {user ? (
              <Avatar
                name={profile?.displayName}
                email={user.email}
                photoURL={user.photoURL}
                onSignInClick={goToLogin}
                onSignOut={handleSignOut}
              />
            ) : (
              <button
                type="button"
                onClick={goToLogin}
                className="rounded-xl bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90"
              >
                Войти
              </button>
            )}
          </div>
        </header>
      </div>

      {/* Контент */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="mb-2 font-display text-2xl font-semibold text-text-primary">
              Правки без хаоса
            </h2>
            <p className="mb-8 text-sm text-text-muted">
              Загружайте макеты, получайте правки с маячками в одном месте
            </p>
            <button
              type="button"
              onClick={goToLogin}
              className="rounded-xl bg-text-primary px-6 py-3 text-sm font-medium text-bg-page transition-all hover:opacity-90"
            >
              Начать бесплатно
            </button>
          </div>
        ) : (
          <>
            {/* Поиск + кнопка "Новый проект" — одинаковая высота, по сетке */}
            <div className="mb-6 flex items-center gap-3">
              <div className="relative h-10 flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск проектов..."
                  className="h-full w-full rounded-xl border border-border-strong bg-bg-input px-3 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                />
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
              <button
                type="button"
                onClick={handleNewProject}
                className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-text-primary px-5 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <PlusIcon className="h-4 w-4" />
                Новый проект
              </button>
            </div>

            {/* Список проектов */}
            {activeProjects.length === 0 && archivedProjects.length === 0 ? (
              <div className="py-20 text-center">
                <p className="mb-4 text-sm text-text-muted">
                  {query ? "Ничего не найдено" : "У вас пока нет проектов"}
                </p>
                {!query && (
                  <button
                    type="button"
                    onClick={handleNewProject}
                    className="rounded-xl border border-border-strong bg-bg-input px-5 py-3 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover"
                  >
                    Создать первый проект
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {activeProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    menuOpen={menuFor === p.id}
                    onSelect={() => handleSelectProject(p.id)}
                    onMenuToggle={() =>
                      setMenuFor(menuFor === p.id ? null : p.id)
                    }
                    onRename={(name) => handleRenameProject(p.id, name)}
                    onPin={() => {
                      handlePinProject(p.id, !p.pinned);
                      setMenuFor(null);
                    }}
                    onArchive={() => {
                      handleArchiveProject(p.id, true);
                      setMenuFor(null);
                    }}
                    onDelete={() => {
                      if (confirm(`Удалить «${p.name}» навсегда?`)) {
                        handleDeleteProject(p.id);
                      }
                      setMenuFor(null);
                    }}
                  />
                ))}

                {archivedProjects.length > 0 && (
                  <>
                    <div className="pt-4 pb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                      Архив
                    </div>
                    {archivedProjects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        menuOpen={menuFor === p.id}
                        onSelect={() => handleSelectProject(p.id)}
                        onMenuToggle={() =>
                          setMenuFor(menuFor === p.id ? null : p.id)
                        }
                        onRename={(name) => handleRenameProject(p.id, name)}
                        onPin={() => {
                          handlePinProject(p.id, !p.pinned);
                          setMenuFor(null);
                        }}
                        onArchive={() => {
                          handleArchiveProject(p.id, false);
                          setMenuFor(null);
                        }}
                        onDelete={() => {
                          if (confirm(`Удалить «${p.name}» навсегда?`)) {
                            handleDeleteProject(p.id);
                          }
                          setMenuFor(null);
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {newProjectOpen && user && (
        <NewProjectModal
          open={newProjectOpen}
          ownerUid={user.uid}
          onClose={() => setNewProjectOpen(false)}
          onCreated={handleProjectCreated}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-border-strong bg-bg-card px-4 py-2.5 text-sm text-text-primary shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ===== Карточка проекта ===== */
function ProjectCard({
  project,
  menuOpen,
  onSelect,
  onMenuToggle,
  onRename,
  onPin,
  onArchive,
  onDelete,
}: {
  project: Project;
  menuOpen: boolean;
  onSelect: () => void;
  onMenuToggle: () => void;
  onRename: (name: string) => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  return (
    <div
      className="group relative rounded-xl border border-border-strong bg-bg-card transition-all hover:border-text-primary/30 hover:bg-bg-cardHover"
      onClick={onSelect}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl">{project.icon || "📁"}</span>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameValue.trim()) {
                  onRename(renameValue.trim());
                  setRenaming(false);
                }
                if (e.key === "Escape") setRenaming(false);
              }}
              onBlur={() => {
                if (renameValue.trim()) onRename(renameValue.trim());
                setRenaming(false);
              }}
              autoFocus
              className="w-full rounded border border-border-strong bg-bg-input px-2 py-1 text-sm text-text-primary focus:outline-none"
            />
          ) : (
            <>
              <div className="truncate text-sm font-medium text-text-primary">
                {project.name}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>Круг {project.currentRound}/{project.roundsTotal}</span>
                <span>·</span>
                <span>{formatRelativeTime(project.updatedAt)}</span>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenuToggle();
          }}
          className="shrink-0 rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-bg-cardHover hover:text-text-primary group-hover:opacity-100"
          aria-label="Меню"
        >
          <DotsIcon className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-2 top-full z-50 mt-1 w-44 rounded-xl border border-border-strong bg-bg-card p-1 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onPin}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
            >
              {project.pinned ? "Открепить" : "Закрепить"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRenameValue(project.name);
                setRenaming(true);
                onMenuToggle();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
            >
              Переименовать
            </button>
            <button
              type="button"
              onClick={onArchive}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
            >
              {project.archived ? "Восстановить" : "В архив"}
            </button>
            <div className="my-1 h-px bg-border-strong" />
            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              Удалить
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ===== ProjectView ===== */
function ProjectView({
  projectId,
  ownerUid,
  onBack,
  onProjectDeleted,
}: {
  projectId: string;
  ownerUid: string;
  onBack: () => void;
  onProjectDeleted: () => void;
}) {
  const [hub, setHub] = useState<any>(null);

  useEffect(() => {
    import("./_components/project-hub").then((mod) => {
      setHub(() => mod.ProjectHub);
    });
  }, []);

  if (!hub) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  const Hub = hub;
  return (
    <Hub
      projectId={projectId}
      ownerUid={ownerUid}
      onBack={onBack}
      onProjectDeleted={onProjectDeleted}
      onProjectUpdated={() => {}}
    />
  );
}

/* ===== Иконки ===== */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
