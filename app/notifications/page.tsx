"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BellIcon } from "../_components/bell-icon";

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
      <header className="sticky top-0 z-20 border-b border-border bg-bg-page/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
            aria-label="Назад"
          >
            <ArrowIcon className="h-5 w-5" />
          </button>
          <h1 className="font-display text-base font-semibold text-text-primary">
            Уведомления
          </h1>
        </div>
      </header>

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
                className={`flex items-start gap-3 rounded-xl border p-4 ${
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

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}
