"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { addFeedback, type FeedbackCategory } from "@/lib/feedback";

const TYPES: { value: FeedbackCategory; label: string }[] = [
  { value: "bug", label: "Нашли баг" },
  { value: "idea", label: "Идея/пожелание" },
  { value: "other", label: "Другое" },
];

const FEEDBACK_DRAFT_KEY = "revio:feedback:draft";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackCategory>("other");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [navBusy, setNavBusy] = useState(false);

  const pathname = usePathname();

  // Не показываем кнопку, пока страница грузится (перезагрузка/переход)
  useEffect(() => {
    if (document.readyState === "complete") {
      setMounted(true);
      return;
    }
    const onLoad = () => setMounted(true);
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = (
      window as unknown as { navigation?: EventTarget }
    ).navigation;
    if (!nav) return;
    const start = () => setNavBusy(true);
    const end = () => setNavBusy(false);
    nav.addEventListener("navigate", start);
    nav.addEventListener("navigatesuccess", end);
    nav.addEventListener("navigateerror", end);
    return () => {
      nav.removeEventListener("navigate", start);
      nav.removeEventListener("navigatesuccess", end);
      nav.removeEventListener("navigateerror", end);
    };
  }, []);

  // Сохраняем черновик, чтобы не пропадало при случайном закрытии
  useEffect(() => {
    if (!open) return;
    try {
      window.localStorage.setItem(
        FEEDBACK_DRAFT_KEY,
        JSON.stringify({ type, text })
      );
    } catch {
      /* ignore */
    }
  }, [open, type, text]);

  // На странице клиента кнопку не показываем (не мешает при загрузке и работе)
  if (pathname?.startsWith("/review/")) return null;
  if (!mounted || navBusy) return null;

  const openForm = () => {
    try {
      const raw = window.localStorage.getItem(FEEDBACK_DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && typeof d.text === "string") setText(d.text);
        if (
          d &&
          (d.type === "bug" || d.type === "idea" || d.type === "other")
        ) {
          setType(d.type);
        }
      }
    } catch {
      /* ignore */
    }
    setSent(false);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
  };

  const submit = async () => {
    const value = text.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    try {
      let userId: string | undefined;
      try {
        const u = await new Promise<import("firebase/auth").User | null>(
          (resolve) => {
            const unsub = onAuthStateChanged(auth, (u) => {
              unsub();
              resolve(u);
            });
            setTimeout(() => {
              unsub();
              resolve(null);
            }, 3000);
          }
        );
        userId = u?.uid;
      } catch {
        userId = undefined;
      }
      await addFeedback({
        type,
        text: value,
        userId,
        url: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      try {
        window.localStorage.removeItem(FEEDBACK_DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setText("");
      setType("other");
      setSent(true);
    } catch (e) {
      console.error("addFeedback error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Плавающая кнопка */}
      <button
        type="button"
        onClick={openForm}
        aria-label="Обратная связь"
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-bg-card text-text-primary shadow-2xl transition-all hover:scale-105 hover:bg-bg-cardHover"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="fixed bottom-20 right-5 z-[70] w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl border border-border-strong bg-bg-card p-5 shadow-2xl"
            >
              {sent ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 text-green-400">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <p className="font-medium text-text-primary">Спасибо!</p>
                  <p className="mt-1 text-sm text-text-muted">
                    Сообщение отправлено, мы его прочитаем.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-4 rounded-xl border border-border-strong px-4 py-2 text-sm text-text-primary transition-all hover:bg-bg-cardHover"
                  >
                    Закрыть
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium text-text-primary">
                      Обратная связь
                    </h3>
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
                      aria-label="Закрыть"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        className="h-4 w-4"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-3 grid grid-cols-3 gap-1.5">
                    {TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className={[
                          "rounded-lg px-2 py-1.5 text-xs font-medium transition-all",
                          type === t.value
                            ? "bg-text-primary text-bg-page"
                            : "border border-border-strong text-text-muted hover:bg-bg-cardHover",
                        ].join(" ")}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Расскажите, что случилось или что хотели бы улучшить..."
                    rows={4}
                    autoFocus
                    className="w-full resize-none rounded-xl border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={submit}
                    disabled={!text.trim() || submitting}
                    className="mt-3 w-full rounded-xl bg-text-primary py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Отправляем..." : "Отправить"}
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
