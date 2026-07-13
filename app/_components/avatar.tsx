"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn, getInitial } from "@/lib/utils";

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  onSignInClick?: () => void;
  onSignOut?: () => void;
  onOpenSettings?: () => void;
  trailing?: ReactNode;
}

export function Avatar({
  name,
  email,
  photoURL,
  onSignInClick,
  onSignOut,
  onOpenSettings,
  trailing,
}: AvatarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAuthed = Boolean(name || email);

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
      className="group relative flex w-full items-center gap-2.5 px-1 py-1"
    >
      {/* Весь блок кликабелен */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isAuthed) onSignInClick?.();
          else setPopoverOpen((v) => !v);
        }}
        aria-label={isAuthed ? "Меню профиля" : "Войти"}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2",
          "transition-all duration-150",
          "hover:bg-bg-cardHover"
        )}
      >
        {/* Круглый аватар 36×36 — всегда на месте */}
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full",
            "transition-all duration-150"
          )}
          style={{
            backgroundColor: isAuthed ? "var(--avatar-bg)" : "var(--bg-input)",
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
            <PlusIcon className="h-4 w-4" />
          )}
        </span>
        {trailing}
      </button>

      {/* Popover — по ширине блока, от левого края */}
      {isAuthed && popoverOpen && (
        <>
          <div className="absolute bottom-full left-0 h-3 w-48" />
          <div
            className="absolute bottom-full z-50 mb-2 w-64 animate-slide-up rounded-2xl border bg-bg-card p-2 shadow-xl"
            style={{
              left: 0,
              transformOrigin: "bottom left",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2">
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
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: "var(--avatar-bg)",
                    color: "var(--avatar-fg)",
                  }}
                >
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ backgroundColor: "currentColor" }}
                  />
                  Free
                </span>
              </div>
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false);
                onOpenSettings?.();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
            >
              <SettingsIcon className="h-4 w-4 text-text-muted" />
              Настройки
            </button>
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false);
                onSignOut?.();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-red-500/10"
              style={{ color: "#EF4444" }}
            >
              <ExitIcon className="h-4 w-4" />
              Выйти
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
