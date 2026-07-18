"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon } from "./_components/bell-icon";
import { Avatar } from "./_components/avatar";
import { ConfirmModal } from "./_components/confirm-modal";
import { NewProjectWizard } from "./_components/new-project-wizard";
import { OnboardingModal } from "./_components/onboarding-modal";
import { signOut, subscribeToAuth, type User } from "@/lib/auth";
import { type UserProfile } from "@/lib/user-profile";
import {
  ProjectIcon,
  getIconIndex,
} from "@/lib/project-icons";
import {
  subscribeToUserProjects,
  deleteProject,
  formatRelativeTime,
  type Project,
} from "@/lib/projects";
import {
  subscribeToUserNotifications,
  type Notification,
} from "@/lib/notifications";

export default function Page() {
  return <App />;
}

function App() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [onboardingNeeded, setOnboardingNeeded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("loading") === "true") {
        setShowLoading(true);
        window.history.replaceState({}, "", "/");
      }
    }
  }, []);

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
      if (showLoading) {
        await new Promise((r) => setTimeout(r, 800));
        setShowLoading(false);
      }
      if (u) {
        const { profile: p, isNew } = await import("@/lib/user-profile").then(
          (m) => m.getOrCreateUserProfile(u)
        );
        setProfile(p);
        setProfileLoaded(true);
        if (isNew || (p && !p.onboardingCompleted)) {
          setOnboardingNeeded(true);
        }
      } else {
        setProfile(null);
        setProjects([]);
        setOnboardingNeeded(false);
        setProfileLoaded(true);
      }
    });
    return () => unsub();
  }, [showLoading]);

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

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const unsub = subscribeToUserNotifications(user.uid, (list) => {
      setNotifications(list);
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
      router.push(`/project/${id}`);
    },
    [user, goToLogin, router]
  );

  const handleProjectCreated = useCallback(
    (id: string) => {
      setNewProjectOpen(false);
      router.push(`/project/${id}`);
      showToast("Проект создан");
    },
    [showToast, router]
  );

  const handleDeleteProject = useCallback(async () => {
    if (!confirmDelete) return;
    await deleteProject(confirmDelete.id);
    setConfirmDelete(null);
    showToast("Проект удалён");
  }, [confirmDelete, showToast]);

  if (showLoading || authLoading || !profileLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-text-primary text-bg-page">
            <span className="font-display text-xl font-bold">R</span>
          </div>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
        </div>
      </div>
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
      <div className="sticky top-0 z-20 px-4 pt-3 md:px-6">
        <header className="mx-auto flex max-w-3xl items-center justify-between rounded-2xl border border-border-strong bg-bg-card px-5 py-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-text-primary text-bg-page">
              <span className="font-display text-xs font-bold">R</span>
            </div>
            <span className="font-display text-lg font-semibold text-text-primary">
              Revio
            </span>
          </div>

          <div className="flex items-center gap-1">
            {user && (
              <button
                type="button"
                onClick={() => router.push("/notifications")}
                className="relative rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
                aria-label="Уведомления"
              >
                <BellIcon className="h-5 w-5" />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {notifications.filter((n) => !n.read).length}
                  </span>
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
            <div className="mb-6 flex items-center gap-3">
              <div className="relative h-10 flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск проектов..."
                  className="h-full w-full rounded-xl border border-border-strong bg-bg-input px-3 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                />
                <svg
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <button
                type="button"
                onClick={handleNewProject}
                className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-text-primary px-5 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="h-4 w-4"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Новый проект
              </button>
            </div>

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
                  <div
                    key={p.id}
                    className="group flex items-center gap-3 rounded-xl border border-border-strong bg-bg-card px-4 py-3 transition-all hover:border-text-primary/30 hover:bg-bg-cardHover cursor-pointer"
                    onClick={() => handleSelectProject(p.id)}
                  >
                    <div className="shrink-0">
                      <ProjectIcon
                        index={p.iconIndex ?? getIconIndex(p.icon)}
                        color={p.iconColor || "#E880FC"}
                        className="h-9 w-9"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {p.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        {p.description && (
                          <span className="truncate">{p.description}</span>
                        )}
                        {!p.description && p.clientName && (
                          <span className="truncate">{p.clientName}</span>
                        )}
                        {!p.description && !p.clientName && (
                          <>
                            <span>
                              Круг {p.currentRound}/{p.roundsTotal}
                            </span>
                            <span>·</span>
                            <span>{formatRelativeTime(p.updatedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ id: p.id, name: p.name });
                      }}
                      className="shrink-0 rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                      aria-label="Удалить"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}

                {archivedProjects.length > 0 && (
                  <>
                    <div className="pt-4 pb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                      Архив
                    </div>
                    {archivedProjects.map((p) => (
                      <div
                        key={p.id}
                        className="group flex items-center gap-3 rounded-xl border border-border-strong bg-bg-card px-4 py-3 transition-all hover:border-text-primary/30 hover:bg-bg-cardHover cursor-pointer opacity-60"
                        onClick={() => handleSelectProject(p.id)}
                      >
                        <div className="shrink-0">
                          <ProjectIcon
                            index={p.iconIndex ?? getIconIndex(p.icon)}
                            color={p.iconColor || "#E880FC"}
                            className="h-9 w-9"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-text-primary">
                            {p.name}
                          </div>
                          <div className="text-xs text-text-muted">Архив</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({ id: p.id, name: p.name });
                          }}
                          className="shrink-0 rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                          aria-label="Удалить"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {newProjectOpen && user && (
        <NewProjectWizard
          open={newProjectOpen}
          ownerUid={user.uid}
          userPlan={profile?.plan || "free"}
          onClose={() => setNewProjectOpen(false)}
          onCreated={handleProjectCreated}
        />
      )}

      {onboardingNeeded && user && (
        <OnboardingModal
          uid={user.uid}
          defaultName={
            profile?.displayName || user.email?.split("@")[0] || ""
          }
          email={user.email}
          photoURL={user.photoURL}
          onComplete={() => {
            setOnboardingNeeded(false);
            setProfile((prev) =>
              prev ? { ...prev, onboardingCompleted: true } : prev
            );
            showToast("Добро пожаловать!");
          }}
        />
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Удалить проект?"
        message={`Проект «${confirmDelete?.name}» будет удалён навсегда. Это действие нельзя отменить.`}
        confirmLabel="Удалить"
        danger
        onConfirm={handleDeleteProject}
        onCancel={() => setConfirmDelete(null)}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 rounded-xl border border-border-strong bg-bg-card px-4 py-2.5 text-sm text-text-primary shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
