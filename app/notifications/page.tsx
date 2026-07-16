"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BellIcon } from "../_components/bell-icon";
import { Avatar } from "../_components/avatar";
import { signOut } from "@/lib/auth";

interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
}

const MOCK: Notification[] = [
  {
    id: "1",
    text: "Клиент Иван оставил правки к проекту «Лендинг для кофейни»",
    time: "2 часа назад",
    read: false,
  },
  {
    id: "2",
    text: "Клиент Мария оставил правки к проекту «Дизайн логотипа»",
    time: "Вчера",
    read: true,
  },
];

export default function NotificationsPage() {
  const router = useRouter();

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
            <button
              type="button"
              onClick={() => router.push("/notifications")}
              className="relative rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
              aria-label="Уведомления"
            >
              <BellIcon className="h-5 w-5" />
            </button>
            <Avatar
              onSignInClick={() => router.push("/login")}
              onSignOut={async () => {
                await signOut();
                router.push("/");
              }}
            />
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        {MOCK.length === 0 ? (
          <div className="py-20 text-center">
            <BellIcon className="mx-auto mb-3 h-8 w-8 text-text-muted" />
            <p className="text-sm text-text-muted">Пока нет уведомлений</p>
          </div>
        ) : (
          <div className="space-y-2">
            {MOCK.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  n.read
                    ? "border-border-strong bg-bg-card"
                    : "border-text-primary/20 bg-bg-card"
                }`}
              >
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text-primary">{n.text}</div>
                  <div className="mt-1 text-xs text-text-muted">{n.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
