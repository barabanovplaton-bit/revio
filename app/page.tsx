"use client";

import { useState, useEffect, useCallback } from "react";
import { ThemeProvider } from "./_lib/theme-context";
import { Sidebar } from "./_components/sidebar";
import { Avatar } from "./_components/avatar";
import { ProjectsPage } from "./_components/projects-page";
import { SignInModal } from "./_components/sign-in-modal";
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
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  // UI state
  const [signInOpen, setSignInOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  // Подписка на авторизацию
  useEffect(() => {
    const unsub = subscribeToAuth(async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
        if (!p || !p.onboardingCompleted) {
          setOnboardingOpen(true);
        }
        setSignInOpen(false);
      } else {
        setProfile(null);
        setOnboardingOpen(false);
        setProjects([]);
        setActiveProjectId(null);
      }
    });
    return () => unsub();
  }, []);

  // Подписка на проекты пользователя
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
      setSignInOpen(true);
      return;
    }
    if (!profile?.onboardingCompleted) {
      setOnboardingOpen(true);
      return;
    }
    setNewProjectOpen(true);
  }, [user, profile]);

  const handleSelectProject = useCallback(
    (id: string) => {
      if (!user) {
        setSignInOpen(true);
        return;
      }
      setActiveProjectId(id);
    },
    [user]
  );

  const handleProjectCreated = useCallback(
    (id: string) => {
      setNewProjectOpen(false);
      setJustCreatedId(id);
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

  const handlePinProject = useCallback(
    async (id: string, pinned: boolean) => {
      await togglePin(id, pinned);
    },
    []
  );

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

  // Пока проверяем авторизацию — показываем лоадер
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="flex h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-page">
      {/* Сайдбар (десктоп) */}
      <div className="hidden md:block">
        <Sidebar
          isAuthed={Boolean(user)}
          userName={profile?.displayName || user?.displayName}
          userEmail={user?.email}
          userPhoto={user?.photoURL}
          onSignInClick={() => setSignInOpen(true)}
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
      </div>

      {/* Основная зона */}
      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        {/* Мобильная шапка (когда нет активного проекта) */}
        {!activeProjectId && (
          <MobileTopBar
            onSignInClick={() => setSignInOpen(true)}
            isAuthed={Boolean(user)}
            userName={profile?.displayName || user?.displayName}
            userEmail={user?.email}
            userPhoto={user?.photoURL}
            onSignOut={handleSignOut}
          />
        )}

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
            <div className="h-full overflow-y-auto">
              <ProjectsPage
                onNewProject={handleNewProject}
                onOpenProject={handleSelectProject}
              />
            </div>
          )}
        </div>
      </main>

      {/* Модалки */}
      <SignInModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        returnTo="/"
      />

      {onboardingOpen && user && (
        <OnboardingModal
          uid={user.uid}
          initialName={user.displayName}
          onComplete={handleOnboardingComplete}
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

/* ===== Мобильная шапка ===== */

function MobileTopBar({
  onSignInClick,
  isAuthed,
  userName,
  userEmail,
  userPhoto,
  onSignOut,
}: {
  onSignInClick: () => void;
  isAuthed: boolean;
  userName?: string | null;
  userEmail?: string | null;
  userPhoto?: string | null;
  onSignOut: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-bg-sidebar px-4 md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-text-primary text-bg-page">
          <span className="font-display text-xs font-bold leading-none">R</span>
        </div>
        <span className="font-display text-base font-semibold text-text-primary">
          Revio
        </span>
      </div>
      <Avatar
        name={isAuthed ? userName : null}
        email={isAuthed ? userEmail : null}
        photoURL={isAuthed ? userPhoto : null}
        onSignInClick={onSignInClick}
        onSignOut={onSignOut}
      />
    </header>
  );
}
