"use client";

import { cn } from "@/lib/utils";

interface EmptyCanvasProps {
  isAuthed: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
  onNewProject: () => void;
}

export function EmptyCanvas({
  isAuthed,
  onSignIn,
  onSignUp,
  onNewProject,
}: EmptyCanvasProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-3 font-display text-3xl font-semibold tracking-tight text-text-primary">
          {isAuthed ? "С чего начнём?" : "Revio"}
        </h1>
        <p className="mb-10 text-sm text-text-muted">
          {isAuthed
            ? "Создайте новый проект — бриф, правки и приёмка в одном месте"
            : "Правки без хаоса в WhatsApp и Telegram"}
        </p>

        {isAuthed ? (
          <button
            type="button"
            onClick={onNewProject}
            className={cn(
              "w-full rounded-xl bg-text-primary px-5 py-3.5",
              "text-sm font-medium text-bg-page",
              "transition-all duration-150",
              "hover:opacity-90 active:scale-[0.98]"
            )}
          >
            + Создать новый проект
          </button>
        ) : (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onSignUp}
              className={cn(
                "w-full rounded-xl bg-text-primary px-5 py-3.5",
                "text-sm font-medium text-bg-page",
                "transition-all duration-150",
                "hover:opacity-90 active:scale-[0.98]"
              )}
            >
              Зарегистрироваться
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className={cn(
                "w-full rounded-xl border border-border-strong bg-bg-input px-5 py-3.5",
                "text-sm font-medium text-text-primary",
                "transition-all duration-150",
                "hover:bg-bg-cardHover active:scale-[0.98]"
              )}
            >
              Войти
            </button>
            <p className="pt-3 text-xs text-text-subtle">
              Вход через Google — без паролей
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
