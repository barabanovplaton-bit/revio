"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "../_components/bell-icon";
import { Avatar } from "../_components/avatar";
import { signOut, subscribeToAuth, type User } from "@/lib/auth";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

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

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Floating header */}
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
        <div className="py-20 text-center">
          <BellIcon className="mx-auto mb-3 h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-muted">Пока нет уведомлений</p>
        </div>
      </main>
    </div>
  );
}
