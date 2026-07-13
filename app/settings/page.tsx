"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { subscribeToAuth, signOut, type User } from "@/lib/auth";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";
import { useTheme } from "../_lib/theme-context";
import { cn } from "@/lib/utils";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";
  const { theme, setTheme } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAuth(async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleBack = () => router.push(returnTo);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push("/login?returnTo=/settings");
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-page">
      <header className="sticky top-0 z-10 border-b bg-bg-sidebar/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Назад
          </button>
          <h1 className="font-display text-lg font-semibold text-text-primary">
            Настройки
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Section title="Профиль">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-avatar-bg text-avatar-fg">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt="Аватар"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-lg font-bold uppercase">
                  {(profile?.displayName || user.displayName || "U")[0]}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-medium text-text-primary">
                {profile?.displayName || user.displayName || "Без имени"}
              </div>
              <div className="truncate text-sm text-text-muted">
                {user.email}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Внешний вид">
          <div className="space-y-3">
            <div>
              <div className="mb-2 text-sm text-text-muted">Тема</div>
              <div className="flex gap-1 rounded-xl bg-bg-input p-1">
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={cn(
                      "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                      theme === t
                        ? "bg-bg-card text-text-primary shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    {t === "light" ? "Светлая" : t === "dark" ? "Тёмная" : "Системная"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm text-text-muted">Язык</div>
              <div className="flex gap-1 rounded-xl bg-bg-input p-1">
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-bg-card px-3 py-2 text-xs font-medium text-text-primary shadow-sm"
                >
                  Русский
                </button>
                <button
                  type="button"
                  disabled
                  className="flex-1 cursor-not-allowed rounded-lg px-3 py-2 text-xs font-medium text-text-subtle"
                  title="Скоро"
                >
                  English (скоро)
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Тариф">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-text-primary">Free план</div>
              <div className="text-xs text-text-muted">
                1 активный проект, 1 круг правок
              </div>
            </div>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg bg-border-strong px-3 py-1.5 text-xs font-medium text-text-subtle"
              title="Скоро"
            >
              Улучшить (скоро)
            </button>
          </div>
        </Section>

        <Section title="Аккаунт">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <ExitIcon className="h-4 w-4" />
            Выйти из аккаунта
          </button>
        </Section>

        <div className="mt-8 text-center text-xs text-text-subtle">
          Revio v0.3.0 · Сделано для фрилансеров
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-text-muted">
        {title}
      </h2>
      <div className="rounded-2xl border bg-bg-card p-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg-page">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ExitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
