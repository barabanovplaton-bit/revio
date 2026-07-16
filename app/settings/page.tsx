"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BellIcon } from "../_components/bell-icon";
import { Avatar } from "../_components/avatar";
import { signOut, subscribeToAuth, type User } from "@/lib/auth";
import {
  getUserProfile,
  updateDisplayName,
  type UserProfile,
} from "@/lib/user-profile";

const ACCENT = "#E880FC";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAuth(async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
        setNameValue(p?.displayName || "");
      }
    });
    return () => unsub();
  }, []);

  const handleSaveName = useCallback(async () => {
    if (!user || !nameValue.trim()) return;
    setSaving(true);
    await updateDisplayName(user.uid, nameValue.trim());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [user, nameValue]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push("/");
  }, [router]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  const initial = nameValue
    ? nameValue.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Floating header */}
      <div className="sticky top-0 z-20 px-4 pt-3 md:px-6">
        <header className="mx-auto flex max-w-3xl items-center justify-between rounded-2xl border border-border-strong bg-bg-card px-5 py-3 shadow-lg">
          <div
            className="flex cursor-pointer items-center gap-2.5"
            onClick={() => router.push("/")}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-text-primary text-bg-page">
              <span className="font-display text-xs font-bold">R</span>
            </div>
            <span className="font-display text-lg font-semibold text-text-primary">
              Revio
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => router.push("/notifications")}
              className="relative rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
              aria-label="Уведомления"
            >
              <BellIcon className="h-5 w-5" />
            </button>
            <Avatar
              name={profile?.displayName}
              email={user?.email}
              photoURL={user?.photoURL}
              onSignInClick={() => router.push("/login")}
              onSignOut={handleSignOut}
            />
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <div className="space-y-6">
          {/* Профиль */}
          <section className="rounded-2xl border border-border-strong bg-bg-card p-6">
            <h2 className="mb-4 text-sm font-medium text-text-muted">
              Профиль
            </h2>
            <div className="flex items-start gap-5">
              {/* Аватар */}
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt="аватар"
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
                  style={{
                    backgroundColor: "var(--avatar-bg)",
                    color: "var(--avatar-fg)",
                  }}
                >
                  {initial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs text-text-muted mb-1">Имя</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    placeholder="Ваше имя"
                    className="h-10 flex-1 rounded-xl border border-border-strong bg-bg-input px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={saving || !nameValue.trim()}
                    className="h-10 shrink-0 rounded-xl bg-text-primary px-4 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                  >
                    {saving ? "..." : "Сохранить"}
                  </button>
                </div>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-1 inline-block text-xs text-text-muted"
                  >
                    Имя сохранено
                  </motion.span>
                )}
                <div className="mt-3 text-xs text-text-muted">
                  {user?.email}
                </div>
              </div>
            </div>
          </section>

          {/* О сервисе */}
          <section className="rounded-2xl border border-border-strong bg-bg-card p-6">
            <h2 className="mb-4 text-sm font-medium text-text-muted">
              О сервисе
            </h2>
            <p className="text-sm leading-relaxed text-text-secondary">
              <strong style={{ color: ACCENT }}>Revio</strong> — платформа для
              сбора визуальных правок. Загружайте макеты, получайте комментарии
              с точечными метками прямо на изображениях. Забудьте о хаосе в
              мессенджерах.
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
              <span>Версия 0.1.0</span>
              <span>·</span>
              <a
                href="https://github.com/barabanovplaton-bit/revio"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-text-primary"
              >
                GitHub
              </a>
              <span>·</span>
              <a
                href="https://t.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-text-primary"
              >
                Поддержка в Telegram
              </a>
            </div>
          </section>

          {/* Тариф */}
          <section className="rounded-2xl border border-border-strong bg-bg-card p-6">
            <h2 className="mb-4 text-sm font-medium text-text-muted">
              Тариф
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-text-primary">
                  Free
                </div>
                <div className="text-xs text-text-muted">
                  1 проект · 10 изображений · 5 кругов
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="h-10 rounded-xl border border-border-strong bg-bg-input px-4 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover"
              >
                Смотреть тарифы
              </button>
            </div>
          </section>

          {/* Выйти — внизу */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border-strong bg-bg-card py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <ExitIcon className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </main>
    </div>
  );
}

function ExitIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
