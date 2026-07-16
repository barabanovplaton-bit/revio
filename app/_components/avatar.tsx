"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn, getInitial } from "@/lib/utils";

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  onSignInClick?: () => void;
  onSignOut?: () => void;
}

export function Avatar({
  name,
  email,
  photoURL,
  onSignInClick,
  onSignOut,
}: AvatarProps) {
  const router = useRouter();
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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isAuthed) onSignInClick?.();
          else setPopoverOpen((v) => !v);
        }}
        aria-label={isAuthed ? "Меню профиля" : "Войти"}
        className={cn(
          "flex h-8 w-8 items-center justify-center overflow-hidden rounded-full transition-all",
          !isAuthed && "border border-border-strong bg-bg-input",
          isAuthed && "bg-avatar-bg text-avatar-fg"
        )}
        style={
          isAuthed
            ? { backgroundColor: "var(--avatar-bg)", color: "var(--avatar-fg)" }
            : undefined
        }
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
          <span className="font-display text-xs font-semibold leading-none">
            {initial}
          </span>
        ) : (
          <UserIcon className="h-4 w-4 text-text-muted" />
        )}
      </button>

      {isAuthed && popoverOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopoverOpen(false)} />
          <div
            className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-border-strong bg-bg-card p-1.5 shadow-xl"
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
                <button
                  type="button"
                  onClick={() => {
                    setPopoverOpen(false);
                    router.push("/pricing");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-text-primary px-2.5 py-0.5 text-[10px] font-medium text-bg-page transition-opacity hover:opacity-80"
                >
                  Free
                </button>
              </div>
            </div>
            <div className="my-1 h-px bg-border-strong" />
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false);
                router.push("/pricing");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
            >
              <CrownIcon className="h-4 w-4 text-text-muted" />
              Тарифы
            </button>
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false);
                router.push("/settings");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
            >
              <SettingsIcon className="h-4 w-4 text-text-muted" />
              Настройки
            </button>
            <div className="my-1 h-px bg-border-strong" />
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false);
                onSignOut?.();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
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

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <path d="M5 16h14v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ExitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
