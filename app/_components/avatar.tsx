"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn, getInitial } from "@/lib/utils";

interface AvatarProps {
  /** Если есть — пользователь авторизован. */
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  /** Любой обработчик на клик по "+". */
  onSignInClick?: () => void;
  onSignOut?: () => void;
  /** Если передан — справа от аватарки рендерится имя/email (expand-режим).
   *  Popover открывается по наведению на ВЕСЬ блок (аватар + имя). */
  trailing?: ReactNode;
}

export function Avatar({
  name,
  email,
  photoURL,
  onSignInClick,
  onSignOut,
  trailing,
}: AvatarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAuthed = Boolean(name || email);

  // Закрываем popover по клику вне
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popoverOpen]);

  const initial = getInitial(name, email);

  return (
    <div
      ref={containerRef}
      className="relative flex w-full items-center gap-3"
      onMouseEnter={() => {
        if (isAuthed) setPopoverOpen(true);
      }}
      onMouseLeave={() => {
        if (isAuthed) setPopoverOpen(false);
      }}
    >
      {/* Сам кружок 32×32, всегда одинаковый */}
      <button
        type="button"
        onClick={() => {
          if (!isAuthed) onSignInClick?.();
          else setPopoverOpen((v) => !v);
        }}
        aria-label={isAuthed ? "Меню профиля" : "Войти"}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          "transition-all duration-150",
          "hover:shadow-glow",
          "overflow-hidden"
        )}
        style={{
          backgroundColor: isAuthed ? "var(--avatar-bg)" : "var(--bg-card)",
          color: isAuthed ? "var(--avatar-fg)" : "var(--text-primary)",
          border: isAuthed ? "none" : "1px solid var(--border-strong)",
        }}
      >
        {isAuthed && photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoURL}
            alt={name || "аватар"}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : isAuthed ? (
          <span className="font-display text-sm font-semibold leading-none">
            {initial}
          </span>
        ) : (
          <PlusIcon className="h-3.5 w-3.5" />
        )}
      </button>

      {/* trailing (имя + email в развёрнутом сайдбаре) */}
      {trailing}

      {/* Popover — только когда авторизован */}
      {isAuthed && popoverOpen && (
        <div
          className="absolute bottom-full left-0 z-50 mb-2 w-64 animate-slide-up rounded-2xl border bg-bg-card p-2 shadow-xl"
          style={{ transformOrigin: "bottom left" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Шапка popover: имя + email + яркий чип тарифа */}
          <div className="px-3 py-2.5">
            <div className="truncate text-sm font-medium text-text-primary">
              {name || "Без имени"}
            </div>
            {email && (
              <div className="mt-0.5 truncate text-xs text-text-muted">
                {email}
              </div>
            )}
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  backgroundColor: "var(--avatar-bg)",
                  color: "var(--avatar-fg)",
                }}
              >
                <span
                  className="h-1 w-1 rounded-full"
                  style={{ backgroundColor: "currentColor" }}
                />
                Free план
              </span>
            </div>
          </div>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => {
              setPopoverOpen(false);
              onSignOut?.();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
          >
            <ExitIcon className="h-4 w-4 text-text-muted" />
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}

/* ===== Иконки ===== */

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
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
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
