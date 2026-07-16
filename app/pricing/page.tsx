"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon } from "../_components/bell-icon";
import { Avatar } from "../_components/avatar";
import { signOut, subscribeToAuth, type User } from "@/lib/auth";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";

const ACCENT = "#E880FC";

const plans = [
  {
    name: "Free",
    price: "0 ₽",
    period: "",
    description: "Для тестирования и небольших проектов",
    features: [
      "1 проект",
      "10 изображений",
      "5 кругов правок",
      "Публичная ссылка для клиента",
    ],
    cta: "Текущий тариф",
    ctaDisabled: true,
  },
  {
    name: "Pro",
    price: "299 ₽",
    period: "/мес",
    description: "Для фрилансеров и команд",
    features: [
      "Безлимит проектов",
      "Безлимит изображений",
      "Безлимит кругов правок",
      "Публичная ссылка для клиента",
      "История версий",
      "Приоритетная поддержка",
    ],
    cta: "Оплатить",
    ctaDisabled: false,
    highlighted: true,
  },
];

const faqItems = [
  {
    q: "Как оплатить?",
    a: "Сейчас мы принимаем оплату через СБП. Нажмите «Оплатить» и получите инструкцию. Позже добавим ЮKassa и другие способы.",
  },
  {
    q: "Можно отменить подписку?",
    a: "Да, в любой момент. Pro отключится в конце оплаченного периода. Без скрытых платежей.",
  },
  {
    q: "Что такое «круги правок»?",
    a: "Каждый раз, когда клиент отправляет правки — это один круг. В Free доступно 5 кругов, в Pro — безлимит.",
  },
  {
    q: "Чем Free отличается от Pro?",
    a: "Free — 1 проект, 10 изображений, 5 кругов. Pro — безлимит всего плюс история версий и приоритетная поддержка.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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

      <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        {/* Заголовок */}
        <div className="mb-10 text-center">
          <h1 className="mb-2 font-display text-3xl font-bold text-text-primary">
            Простое ценообразование
          </h1>
          <p className="text-sm text-text-muted">
            Начните бесплатно. Обновитесь, когда будете готовы.
          </p>
        </div>

        {/* Карточки — flex col, кнопка внизу через mt-auto */}
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.35 }}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                plan.highlighted
                  ? "border-text-primary bg-bg-card"
                  : "border-border-strong bg-bg-card"
              }`}
            >
              {plan.highlighted && (
                <div
                  className="absolute -top-3 left-6 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ backgroundColor: ACCENT, color: "#000" }}
                >
                  Популярный
                </div>
              )}
              <div className="mb-4">
                <div className="text-sm font-medium text-text-muted">
                  {plan.name}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold text-text-primary">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-text-muted">
                      {plan.period}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {plan.description}
                </div>
              </div>
              <ul className="mb-6 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <CheckIcon
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      style={
                        plan.highlighted
                          ? { color: ACCENT }
                          : { color: "var(--text-muted)" }
                      }
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={plan.ctaDisabled}
                onClick={() => {
                  if (!plan.ctaDisabled) {
                    alert("Оплата через СБП будет доступна в следующем шаге");
                  }
                }}
                className={`h-10 w-full rounded-xl text-sm font-medium transition-all ${
                  plan.ctaDisabled
                    ? "cursor-default border border-border-strong bg-bg-input text-text-muted"
                    : "bg-text-primary text-bg-page hover:opacity-90 active:scale-[0.98]"
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* FAQ — Accordion, текст по центру */}
        <div className="mx-auto mt-16 max-w-lg">
          <h3 className="mb-4 text-center text-sm font-medium text-text-muted">
            Часто задаваемые вопросы
          </h3>
          <div className="space-y-2">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-border-strong bg-bg-card overflow-hidden transition-colors hover:border-text-primary/30"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-text-primary transition-colors hover:bg-bg-cardHover"
                >
                  {item.q}
                  <ChevronIcon
                    className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="px-4 pb-3 text-center text-xs leading-relaxed text-text-muted">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function CheckIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
