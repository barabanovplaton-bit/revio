"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const ACCENT = "#E880FC";

export default function SettingsPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

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
            Настройки
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <div className="space-y-6">
          {/* Профиль */}
          <section className="rounded-xl border border-border-strong bg-bg-card p-5">
            <h2 className="mb-4 text-sm font-medium text-text-muted">
              Профиль
            </h2>
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold"
                style={{
                  backgroundColor: "var(--avatar-bg)",
                  color: "var(--avatar-fg)",
                }}
              >
                П
              </div>
              <div>
                <div className="text-sm font-medium text-text-primary">
                  Платон
                </div>
                <div className="text-xs text-text-muted">
                  barabanovplaton@gmail.com
                </div>
              </div>
            </div>
          </section>

          {/* О сервисе */}
          <section className="rounded-xl border border-border-strong bg-bg-card p-5">
            <h2 className="mb-4 text-sm font-medium text-text-muted">
              О сервисе
            </h2>
            <p className="text-sm leading-relaxed text-text-secondary">
              <strong style={{ color: ACCENT }}>Revio</strong> — платформа для
              сбора визуальных правок. Загружайте макеты, получайте комментарии
              с точечными метками прямо на изображениях. Забудьте о хаосе в
              мессенджерах.
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
              <span>Версия 0.1.0</span>
              <span>·</span>
              <a
                href="https://github.com/barabanovplaton-bit/revio"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-text-primary"
              >
                GitHub
              </a>
            </div>
          </section>

          {/* Тариф */}
          <section className="rounded-xl border border-border-strong bg-bg-card p-5">
            <h2 className="mb-4 text-sm font-medium text-text-muted">
              Тариф
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-text-primary">
                  Free
                </div>
                <div className="text-xs text-text-muted">
                  1 проект · 5 изображений · 1 круг правок
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="rounded-lg border border-border-strong bg-bg-input px-4 py-2 text-xs font-medium text-text-primary transition-all hover:bg-bg-cardHover"
              >
                Смотреть тарифы
              </button>
            </div>
          </section>

          {/* Сохранить */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }}
              className="rounded-xl bg-text-primary px-5 py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Сохранить
            </button>
            {saved && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-text-muted"
              >
                Сохранено
              </motion.span>
            )}
          </div>
        </div>
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
