"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeProvider } from "./_lib/theme-context";
import { Sidebar } from "./_components/sidebar";
import { Avatar } from "./_components/avatar";
import { Canvas } from "./_components/canvas";
import { OnboardingModal } from "./_components/onboarding-modal";
import { NewProjectModal } from "./_components/new-project-modal";
import { ProjectHub } from "./_components/project-hub";
import { signOut, subscribeToAuth, type User } from "@/lib/auth";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";
import {
  subscribeToUserProjects,
  updateProject,
  togglePin,
  toggleArchive,
  deleteProject,
  type Project,
} from "@/lib/projects";

export default function Page() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

function App() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  // Переход на /login (чистый URL без параметров)
  const goToLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  useEffect(() => {
    const unsub = subscribeToAuth(async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        // ПОКА profile грузится — показываем лоадер, НЕ Canvas
        // + минимальная задержка 600мс чтобы скрыть любые мигания
        setProfileLoading(true);
        const [p] = await Promise.all([
          getUserProfile(u.uid),
          new Promise((r) => setTimeout(r, 600)),
        ]);
        setProfile(p);
        setProfileLoading(false);
        if (!p || !p.onboardingCompleted) {
          setOnboardingOpen(true);
        }
      } else {
        setProfile(null);
        setOnboardingOpen(false);
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

  const handleOnboardingComplete = useCallback(
    (data: { displayName: string }) => {
      setProfile((p) =>
        p ? { ...p, displayName: data.displayName, onboardingCompleted: true } : p
      );
      setOnboardingOpen(false);
      showToast(`Добро пожаловать, ${data.displayName}!`);
    },
    [showToast]
  );

  const handleNewProject = useCallback(() => {
    if (!user) {
      goToLogin();
      return;
    }
    if (!profile?.onboardingCompleted) {
      setOnboardingOpen(true);
      return;
    }
    setNewProjectOpen(true);
    setMobileSidebarOpen(false);
  }, [user, profile, goToLogin]);

  const handleSelectProject = useCallback(
    (id: string) => {
      if (!user) {
        goToLogin();
        return;
      }
      setActiveProjectId(id);
      setMobileSidebarOpen(false);
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

  // ЖЁСТКИЙ фикс мигания: показываем лоадер пока authLoading ИЛИ
  // user есть, но profile ещё не загружен (иначе Canvas мигнёт с аватаркой)
  const showLoader = authLoading || (Boolean(user) && !profile);
  if (showLoader) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="flex h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  const sidebarContent = (
    <Sidebar
      isAuthed={Boolean(user)}
      userName={profile?.displayName || user?.displayName}
      userEmail={user?.email}
      userPhoto={user?.photoURL}
      onSignInClick={goToLogin}
      onSignOut={handleSignOut}
      projects={projects}
      activeProjectId={activeProjectId}
      onSelectProject={handleSelectProject}
      onNewProject={handleNewProject}
      onPinProject={handlePinProject}
      onArchiveProject={handleArchiveProject}
      onRenameProject={handleRenameProject}
      onDeleteProject={handleDeleteProject}
    />
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-page">
      {/* Сайдбар (десктоп) */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* Мобильная шторка — 80vw (4/5), overlay на 20% справа */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Overlay только на 20% справа (не покрывает шторку) */}
            <motion.div
              className="absolute top-0 h-full bg-black/60 backdrop-blur-sm"
              style={{ left: "80vw", right: 0 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => setMobileSidebarOpen(false)}
            />
            {/* Шторка 80vw (4/5 экрана) */}
            <motion.div
              className="absolute left-0 top-0 h-full"
              style={{ width: "80vw" }}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Основная зона */}
      <main className="relative flex h-screen flex-1 flex-col overflow-hidden">
        {/* Плавающий гамбургер на мобиле — без шапки */}
        {!activeProjectId && (
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Открыть меню"
            className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg-card text-text-primary shadow-sm transition-all hover:bg-bg-cardHover active:scale-95 md:hidden"
          >
            <HamburgerIcon className="h-5 w-5" />
          </button>
        )}

        {/* Аватар справа сверху на мобиле — УБРАН (по фидбеку Платона) */}

        <div className="flex-1 overflow-hidden">
          {activeProjectId && user ? (
            <ProjectHub
              projectId={activeProjectId}
              ownerUid={user.uid}
              onBack={() => setActiveProjectId(null)}
              onProjectDeleted={() => setActiveProjectId(null)}
              onProjectUpdated={() => {}}
            />
          ) : (
            <Canvas
              isAuthed={Boolean(user)}
              projects={projects}
              activeProjectId={activeProjectId}
              onSignIn={goToLogin}
              onSignUp={goToLogin}
              onNewProject={handleNewProject}
              onSelectProject={handleSelectProject}
            />
          )}
        </div>
      </main>

      {/* Модалки */}
      {onboardingOpen && user && (
        <OnboardingModal
          uid={user.uid}
          initialName={user.displayName}
          initialPhoto={user.photoURL}
          onComplete={handleOnboardingComplete}
          onCancel={async () => {
            await signOut();
            setOnboardingOpen(false);
          }}
        />
      )}

      {newProjectOpen && user && (
        <NewProjectModal
          open={newProjectOpen}
          ownerUid={user.uid}
          onClose={() => setNewProjectOpen(false)}
          onCreated={handleProjectCreated}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slide-up rounded-xl border bg-bg-card px-4 py-2.5 text-sm text-text-primary shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
