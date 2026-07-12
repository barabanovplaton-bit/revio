"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithGoogle,
  signOut,
  subscribeToAuth,
  handleRedirectResult,
  type User,
} from "@/lib/auth";
import { getUserProfile } from "@/lib/user-profile";
import { cn } from "@/lib/utils";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Куда вернуться после входа
  const returnTo = searchParams.get("returnTo") || "/";

  useEffect(() => {
    // Обработка redirect-результата (если вошли через redirect в iframe)
    handleRedirectResult().catch((e) => console.error("redirect result error:", e));

    const unsub = subscribeToAuth(async (u: User | null) => {
      if (u) {
        const p = await getUserProfile(u.uid);
        if (p?.onboardingCompleted) {
          router.push(returnTo);
        } else {
          // Если онбординг не пройден — на главную, там откроется OnboardingModal
          router.push("/");
        }
      }
    });
    return () => unsub();
  }, [router, returnTo]);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // subscribeToAuth сработает и редиректнёт
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Не удалось войти";
      setError(msg.split("(")[0].trim() || "Не удалось войти");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg-page p-6">
      {/* Декоративный фон */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Логотип + название */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-text-primary text-bg-page">
            <span className="font-display text-3xl font-bold leading-none">R</span>
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-text-primary">
            Revio
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Правки без хаоса в WhatsApp
          </p>
        </div>

        {/* Кнопки входа */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            className={cn(
              "flex w-full items-center justify-center gap-3 rounded-2xl bg-text-primary px-5 py-4",
              "text-base font-medium text-bg-page",
              "transition-all duration-150",
              "hover:opacity-90 active:scale-[0.99]",
              "disabled:opacity-60"
            )}
          >
            <GoogleIcon className="h-5 w-5" />
            {loading ? "Открываем Google..." : "Продолжить с Google"}
          </button>

          <button
            type="button"
            disabled
            className={cn(
              "flex w-full items-center justify-center gap-3 rounded-2xl border border-border-strong bg-bg-input px-5 py-4",
              "text-base font-medium text-text-muted",
              "cursor-not-allowed opacity-60"
            )}
            title="Будет добавлен позже"
          >
            <MailIcon className="h-5 w-5" />
            Войти по почте (скоро)
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Назад */}
        <button
          type="button"
          onClick={() => router.push(returnTo)}
          className="mx-auto mt-10 block text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          ← Вернуться
        </button>

        <p className="mt-8 text-center text-xs text-text-subtle">
          Продолжая, вы соглашаетесь с условиями использования.
          <br />
          Мы не передаём данные третьим лицам.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg-page">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  );
}
