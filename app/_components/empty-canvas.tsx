"use client";

import { cn } from "@/lib/utils";

interface EmptyCanvasProps {
  /** Если false — юзер не залогинен, показываем кнопки Войти/Регистрация */
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
        {/* Логотип */}
        <div className="mb-6 flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-text-primary text-bg-page">
          <span className="font-display text-2xl font-bold leading-none">R</span>
        </div>

        <h1 className="mb-2 font-display text-2xl font-semibold tracking-tight text-text-primary">
          {isAuthed ? "С чего начнём?" : "Добро пожаловать в Revio"}
        </h1>
        <p className="mb-8 text-sm text-text-muted">
          {isAuthed
            ? "Создайте новый проект — бриф, правки и приёмка в одном месте"
            : "Инструмент для фрилансеров: брифы, правки с маячками и приёмка проекта без хаоса в WhatsApp"}
        </p>

        {isAuthed ? (
          <button
            type="button"
            onClick={onNewProject}
            className={cn(
              "w-full rounded-xl bg-text-primary px-5 py-3",
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
                "w-full rounded-xl bg-text-primary px-5 py-3",
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
                "w-full rounded-xl border border-border-strong bg-bg-input px-5 py-3",
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
