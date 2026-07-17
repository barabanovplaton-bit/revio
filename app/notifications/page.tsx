"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "../_components/bell-icon";
import { Avatar } from "../_components/avatar";
import {
  signOut,
  subscribeToAuth,
  type User,
} from "@/lib/auth";
import {
  getUserProfile,
  type UserProfile,
} from "@/lib/user-profile";
import {
  subscribeToUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  formatNotificationTime,
  type Notification,
} from "@/lib/notifications";

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsub = subscribeToAuth(async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserNotifications(user.uid, (list) => {
      setNotifications(list);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || notifications.length === 0) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length > 0) {
      const timer = setTimeout(() => {
        markAllNotificationsRead(user.uid);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, notifications]);

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
    }
    router.push(`/`);
  };

  return (
    <div className="min-h-screen bg-bg-page">
      <div className="sticky top-0 z-20 px-4 pt-3 md:px-6">
        <header className="mx-auto flex max-w-3xl items-center justify-between rounded-2xl border border-border-strong bg-bg-card px-5 py-3 shadow-lg">
          <div
            className="flex cursor-pointer items-center gap-2.5"
            onClick={() => router.push("/")}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-text-primary text-bg-page">
              <span className="font-display text-xs font-bold">R</span>
            </div>
            <span className="font-display text-lg font-semibold text-text-primary">
              Revio
            </span>
          </div>
          <div className="flex items-center gap-1">
            {user && (
              <button
                type="button"
                onClick={() => router.push("/notifications")}
                className="relative rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
                aria-label="Уведомления"
              >
                <BellIcon className="h-5 w-5" />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>
            )}
            {user ? (
              <Avatar
                name={profile?.displayName}
                email={user.email}
                photoURL={user.photoURL}
                onSignInClick={() => router.push("/login")}
                onSignOut={async () => {
                  await signOut();
                  router.push("/");
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="h-9 rounded-xl bg-text-primary px-4 text-sm font-medium text-bg-page transition-all hover:opacity-90"
              >
                Войти
              </button>
            )}
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        {notifications.length === 0 ? (
          <div className="py-20 text-center">
            <BellIcon className="mx-auto mb-3 h-8 w-8 text-text-muted" />
            <p className="text-sm text-text-muted">Пока нет уведомлений</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left rounded-xl border border-border-strong p-4 transition-all hover:bg-bg-cardHover ${
                  n.read
                    ? "bg-bg-card"
                    : "bg-bg-card border-text-primary/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      n.type === "revisions_submitted"
                        ? "bg-yellow-500/20"
                        : "bg-green-500/20"
                    }`}
                  >
                    {n.type === "revisions_submitted" ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className={`h-4 w-4 ${
                          n.read ? "text-text-muted" : "text-yellow-400"
                        }`}
                      >
                        <path d="m22 2-7 20-4-9-9-4z" />
                        <path d="M22 2 11 13" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className={`h-4 w-4 ${
                          n.read ? "text-text-muted" : "text-green-400"
                        }`}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        n.read
                          ? "text-text-muted"
                          : "text-text-primary font-medium"
                      }`}
                    >
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-text-muted">
                      {formatNotificationTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
