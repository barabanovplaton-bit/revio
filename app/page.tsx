"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Landing } from "./_components/landing";
import { subscribeToAuth, type User } from "@/lib/auth";

/**
 * Главная страница (/) — лендинг для неавторизованных.
 * Авторизованных пользователей автоматически перенаправляет в личный кабинет
 * (список проектов) на /projects.
 */
export default function Page() {
  return <LandingGate />;
}

function LandingGate() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/projects");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

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
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="rounded-xl bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90"
          >
            Войти
          </button>
        </header>
      </div>

      <main className="mx-auto w-full flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto w-full max-w-5xl">
          <Landing />
        </div>
      </main>
    </div>
  );
}