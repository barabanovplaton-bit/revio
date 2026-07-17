"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithGoogle,
  handleRedirectResult,
  subscribeToAuth,
  sendPasswordReset,
} from "@/lib/auth";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getOrCreateUserProfile } from "@/lib/user-profile";

type AuthTab = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<"choose" | "email">("choose");
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    handleRedirectResult().then((user) => {
      if (user) {
        setLoading(true);
        router.push("/?loading=true");
      }
    });
    const unsub = subscribeToAuth((user) => {
      if (user) {
        setLoading(true);
        router.push("/?loading=true");
      }
    });
    return () => unsub();
  }, [router]);

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      router.push("/?loading=true");
    } catch (e: any) {
      setLoading(false);
      console.error("Login error:", e);
    }
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await getOrCreateUserProfile(cred.user);
      router.push("/?loading=true");
    } catch (e: any) {
      const code = e?.code || "";
      if (code === "auth/user-not-found") {
        setError("Аккаунт не найден. Нажмите «Зарегистрироваться».");
      } else if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setError("Неверный email или пароль.");
      } else if (code === "auth/invalid-email") {
        setError("Некорректный email.");
      } else {
        setError("Ошибка. Попробуйте ещё раз.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await getOrCreateUserProfile(cred.user);
      router.push("/?loading=true");
    } catch (e: any) {
      const code = e?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("Этот email уже зарегистрирован. Нажмите «Войти».");
      } else if (code === "auth/weak-password") {
        setError("Пароль слишком короткий (минимум 6 символов).");
      } else if (code === "auth/invalid-email") {
        setError("Некорректный email.");
      } else {
        setError("Ошибка. Попробуйте ещё раз.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setSuccess("");
    if (!email) {
      setError("Введите email для восстановления пароля.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccess("Ссылка для восстановления отправлена на " + email);
    } catch (e: any) {
      if (e?.code === "auth/user-not-found") {
        setError("Аккаунт с таким email не найден.");
      } else {
        setError("Ошибка. Попробуйте ещё раз.");
      }
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = email.length > 0 && password.length >= 6;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4">
      <div className="w-full max-w-sm text-center">
        {/* Лого */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-text-primary text-bg-page">
            <span className="font-display text-lg font-bold">R</span>
          </div>
        </div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-text-primary">
          Вход в Revio
        </h1>
        <p className="mb-8 text-sm text-text-muted">Правки без хаоса</p>

        {screen === "choose" ? (
          <>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-border-strong bg-bg-card px-5 py-3 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover active:scale-[0.98] disabled:opacity-40"
              >
                <GoogleIcon className="h-5 w-5" />
                Войти через Google
              </button>
              <button
                type="button"
                onClick={() => setScreen("email")}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-border-strong bg-bg-card px-5 py-3 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover active:scale-[0.98]"
              >
                <MailIcon className="h-5 w-5" />
                Войти через почту
              </button>
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              ← На главную
            </button>
          </>
        ) : (
          <>
            {/* Табы */}
            <div className="mb-6 flex rounded-xl border border-border-strong bg-bg-input p-1">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  tab === "login"
                    ? "bg-bg-card text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Войти
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("register");
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  tab === "register"
                    ? "bg-bg-card text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Зарегистрироваться
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                placeholder="Email"
                className="h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
              />
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  placeholder="Пароль (минимум 6 символов)"
                  className="h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                />
                {password.length > 0 && (
                  <div className="mt-1 flex items-center justify-between px-1">
                    <span className="text-[10px] text-text-muted">
                      {password.length}/6 минимум
                    </span>
                    <span
                      className={`text-[10px] ${
                        password.length >= 6 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {password.length >= 6 ? "✓ ОК" : "✕ Мало"}
                    </span>
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}
              {success && <p className="text-xs text-green-400">{success}</p>}

              <button
                type="button"
                onClick={tab === "login" ? handleLogin : handleRegister}
                disabled={loading || !canSubmit}
                className="h-12 w-full rounded-xl bg-text-primary text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
              >
                {loading
                  ? "..."
                  : tab === "login"
                    ? "Войти"
                    : "Зарегистрироваться"}
              </button>

              {tab === "login" && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs text-text-muted transition-colors hover:text-text-primary"
                >
                  Забыли пароль?
                </button>
              )}

              <div className="pt-2 text-xs text-text-muted">
                {tab === "login" ? (
                  <>
                    Нет аккаунта?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setTab("register");
                        setError("");
                        setSuccess("");
                      }}
                      className="font-medium text-text-primary transition-colors hover:opacity-80"
                    >
                      Зарегистрируйтесь
                    </button>
                  </>
                ) : (
                  <>
                    Уже есть аккаунт?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setTab("login");
                        setError("");
                        setSuccess("");
                      }}
                      className="font-medium text-text-primary transition-colors hover:opacity-80"
                    >
                      Войдите
                    </button>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setScreen("choose");
                setError("");
                setSuccess("");
                setEmail("");
                setPassword("");
              }}
              className="mt-6 text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              ← Назад
            </button>
          </>
        )}
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
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
