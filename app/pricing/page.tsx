"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const ACCENT = "#E880FC";

const plans = [
  {
    name: "Free",
    price: "0 ₽",
    period: "",
    description: "Для тестирования и небольших проектов",
    features: [
      "1 проект",
      "5 изображений",
      "1 круг правок",
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
      "5 кругов правок",
      "Публичная ссылка для клиента",
      "История версий",
      "Приоритетная поддержка",
    ],
    cta: "Оплатить",
    ctaDisabled: false,
    highlighted: true,
  },
];

export default function PricingPage() {
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
            Тарифы
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        {/* Заголовок */}
        <div className="mb-10 text-center">
          <h2 className="mb-2 font-display text-3xl font-bold text-text-primary">
            Простое ценообразование
          </h2>
          <p className="text-sm text-text-muted">
            Начните бесплатно. Обновитесь, когда будете готовы.
          </p>
        </div>

        {/* Карточки */}
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.35 }}
              className={`relative rounded-2xl border p-6 ${
                plan.highlighted
                  ? "border-text-primary bg-bg-card"
                  : "border-border-strong bg-bg-card"
              }`}
            >
              {plan.highlighted && (
                <div
                  className="absolute -top-3 left-6 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: ACCENT,
                    color: "#000",
                  }}
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
              <ul className="mb-6 space-y-2">
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
                    alert("Оплата будет доступна в следующем шаге");
                  }
                }}
                className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all ${
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

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-lg space-y-4">
          <h3 className="text-center text-sm font-medium text-text-muted">
            Часто задаваемые вопросы
          </h3>
          <FaqItem
            q="Можно попробовать Pro бесплатно?"
            a="Да, напишите нам — дадим 7 дней бесплатно."
          />
          <FaqItem
            q="Как оплатить?"
            a="Сейчас ручная активация. Напишите нам, и мы включим Pro."
          />
          <FaqItem
            q="Можно отменить?"
            a="Да, в любой момент. Pro отключится в конце периода."
          />
        </div>
      </main>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border border-border-strong bg-bg-card p-4">
      <div className="mb-1 text-sm font-medium text-text-primary">{q}</div>
      <div className="text-xs text-text-muted">{a}</div>
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
