"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, handleRedirectResult, subscribeToAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Обработка redirect результата
    handleRedirectResult().then((user) => {
      if (user) {
        router.push("/");
      }
    });

    // Если уже залогинен — редирект
    const unsub = subscribeToAuth((user) => {
      if (user) {
        router.push("/");
      }
    });
    return () => unsub();
  }, [router]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (e) {
      console.error("Login error:", e);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-text-primary text-bg-page">
            <span className="font-display text-lg font-bold">R</span>
          </div>
        </div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-text-primary">
          Вход в Revio
        </h1>
        <p className="mb-8 text-sm text-text-muted">
          Правки без хаоса в WhatsApp
        </p>
        <button
          type="button"
          onClick={handleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border-strong bg-bg-card px-5 py-3 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover active:scale-[0.98]"
        >
          <GoogleIcon className="h-5 w-5" />
          Войти через Google
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          ← Назад
        </button>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
