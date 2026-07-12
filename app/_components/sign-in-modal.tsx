"use client";

import { useRouter } from "next/navigation";

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
  /** Не используется больше — реальный вход через /login страницу. Оставлен для совместимости. */
  onSignIn?: () => Promise<void>;
  returnTo?: string;
}

export function SignInModal({ open, onClose, returnTo = "/" }: SignInModalProps) {
  const router = useRouter();
  if (!open) return null;

  const handleGoToLogin = () => {
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full max-w-sm animate-slide-up rounded-3xl border bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-text-primary text-bg-page">
            <span className="font-display text-lg font-bold leading-none">R</span>
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-text-primary">
            Revio
          </span>
        </div>
        <h2 className="mb-1 text-lg font-medium text-text-primary">
          Войдите, чтобы продолжить
        </h2>
        <p className="mb-6 text-sm text-text-muted">
          Нужно создать проект или открыть существующий. Вход через Google — без паролей.
        </p>
        <button
          type="button"
          onClick={handleGoToLogin}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border-strong bg-bg-input px-4 py-3 text-sm font-medium text-text-primary transition-all duration-150 hover:bg-bg-cardHover active:scale-[0.99]"
        >
          <GoogleIcon className="h-5 w-5" />
          Продолжить с Google
        </button>

        <p className="mt-4 text-center text-xs text-text-subtle">
          Нажимая кнопку, вы переходите на страницу входа.
        </p>
      </div>
    </div>
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
