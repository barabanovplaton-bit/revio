"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeToAuth, type User } from "@/lib/auth";
import {
  subscribeFeedback,
  markFeedbackRead,
  OWNER_UIDS,
  type Feedback,
} from "@/lib/feedback";
import { formatRelativeTime } from "@/lib/projects";

const TYPE_LABELS: Record<string, string> = {
  bug: "Баг",
  idea: "Идея",
  other: "Другое",
};

export default function FeedbackPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Feedback[]>([]);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !OWNER_UIDS.has(user.uid)) return;
    const unsub = subscribeFeedback(setList);
    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  if (!user || !OWNER_UIDS.has(user.uid)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-page px-4 text-center">
        <p className="text-sm text-text-muted">Нет доступа к этой странице.</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-xl bg-text-primary px-5 py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90"
        >
          На главную
        </button>
      </div>
    );
  }

  const unread = list.filter((f) => !f.read).length;

  return (
    <div className="min-h-screen bg-bg-page px-4 py-6 md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-text-primary">
              Отзывы и сообщения
            </h1>
            <p className="text-xs text-text-muted">
              {list.length} всего · {unread} непрочитанных
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 rounded-xl border border-border-strong px-3 py-2 text-xs font-medium text-text-primary transition-all hover:bg-bg-cardHover"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Назад
          </button>
        </div>

        {list.length === 0 ? (
          <p className="py-20 text-center text-sm text-text-muted">
            Пока нет сообщений.
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((f) => (
              <div
                key={f.id}
                className={[
                  "rounded-xl border bg-bg-card p-4",
                  f.read
                    ? "border-border-strong"
                    : "border-text-primary/40",
                ].join(" ")}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-text-primary/15 px-2 py-0.5 text-[11px] font-medium text-text-primary">
                    {TYPE_LABELS[f.type] || f.type}
                  </span>
                  {!f.read && (
                    <span className="rounded-lg bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-400">
                      Новое
                    </span>
                  )}
                  <span className="text-[11px] text-text-muted">
                    {f.createdAt
                      ? formatRelativeTime(f.createdAt)
                      : ""}
                  </span>
                  {f.url && (
                    <span className="text-[11px] text-text-muted">
                      · {f.url}
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-primary">{f.text}</p>
                {f.email && (
                  <p className="mt-1 text-xs text-text-muted">{f.email}</p>
                )}
                {!f.read && (
                  <button
                    type="button"
                    onClick={() => markFeedbackRead(f.id)}
                    className="mt-2 rounded-lg border border-border-strong px-2.5 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
                  >
                    Отметить прочитанным
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
