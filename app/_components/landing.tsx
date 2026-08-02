"use client";

import { useRouter } from "next/navigation";

const STEPS = [
  {
    num: "1",
    title: "Загрузите макеты",
    text: "Загрузите изображения, создайте проект и получите ссылку.",
  },
  {
    num: "2",
    title: "Отправьте ссылку клиенту",
    text: "Клиент открывает холст без регистрации и тыкает на картинку.",
  },
  {
    num: "3",
    title: "Получайте правки с маячками",
    text: "Каждая правка — точка на макете с номером и комментарием.",
  },
];

const FAQ = [
  {
    q: "Это бесплатно?",
    a: "Да, есть бесплатный тариф: до 3 проектов и 10 изображений в каждом. Для безлимита — Pro.",
  },
  {
    q: "Нужна ли клиенту регистрация?",
    a: "Нет. Клиент просто открывает ссылку, ставит маячки и нажимает «Готово».",
  },
  {
    q: "Сколько раундов правок?",
    a: "На бесплатном тарифе можно добавить до 5 раундов правок на проект, на Pro — без ограничений.",
  },
  {
    q: "Как перейти на Pro?",
    a: "Нажмите «Pro безлимит» и напишите нам в Telegram — включим вручную. Пока идёт тест — бесплатно.",
  },
];

export function Landing() {
  const router = useRouter();
  const goToLogin = () => router.push("/login");

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 md:px-6">
      {/* Hero */}
      <section className="grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
        <div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary md:text-5xl">
            Правки без хаоса
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-text-muted md:text-base">
            Загрузите макеты, отправьте клиенту ссылку и получайте правки
            с маячками в одном месте. Никаких скриншотов в переписке.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goToLogin}
              className="rounded-xl bg-text-primary px-6 py-3 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Начать бесплатно
            </button>
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-xl border border-border-strong px-6 py-3 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover"
            >
              Как это работает
            </button>
          </div>
        </div>

        {/* Имитация холста */}
        <div className="relative rounded-2xl border border-border-strong bg-bg-card p-4 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border-strong pb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
            <span className="ml-2 truncate text-xs text-text-muted">
              Раунд 1 · холст правок
            </span>
          </div>
          <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-xl bg-bg-input">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-[70%] w-[85%] rounded-lg border border-text-primary/20 bg-bg-card" />
            </div>
            {[
              { l: "32%", t: "26%", n: 1 },
              { l: "58%", t: "38%", n: 2 },
              { l: "44%", t: "64%", n: 3 },
            ].map((m) => (
              <div
                key={m.n}
                className="absolute flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-text-primary text-[11px] font-bold text-bg-page shadow-lg"
                style={{ left: m.l, top: m.t }}
              >
                {m.n}
              </div>
            ))}
            <div className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Как работает */}
      <section id="how-it-works" className="py-10">
        <h2 className="mb-8 text-center font-display text-2xl font-semibold text-text-primary">
          Как это работает
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="rounded-2xl border border-border-strong bg-bg-card p-6"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-text-primary text-sm font-bold text-bg-page">
                {s.num}
              </div>
              <h3 className="mb-1.5 font-medium text-text-primary">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-muted">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Тарифы */}
      <section className="py-10">
        <h2 className="mb-8 text-center font-display text-2xl font-semibold text-text-primary">
          Тарифы
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border-strong bg-bg-card p-6">
            <h3 className="font-medium text-text-primary">Free</h3>
            <p className="mt-1 text-2xl font-semibold text-text-primary">
              0 ₽
              <span className="ml-1 text-sm font-normal text-text-muted">
                навсегда
              </span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-muted">
              <li>• До 3 проектов</li>
              <li>• До 10 изображений на проект</li>
              <li>• До 5 раундов правок</li>
            </ul>
            <button
              type="button"
              onClick={goToLogin}
              className="mt-6 w-full rounded-xl border border-border-strong py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover"
            >
              Начать бесплатно
            </button>
          </div>
          <div className="rounded-2xl border border-text-primary/40 bg-bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-text-primary">Pro</h3>
              <span className="rounded-lg bg-text-primary/15 px-2 py-0.5 text-xs font-medium text-text-primary">
                Рекомендуем
              </span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-text-primary">
              299 ₽
              <span className="ml-1 text-sm font-normal text-text-muted">
                /мес
              </span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-muted">
              <li>• Безлимит проектов</li>
              <li>• Безлимит изображений</li>
              <li>• Безлимит раундов правок</li>
            </ul>
            <button
              type="button"
              onClick={() => router.push("/pricing")}
              className="mt-6 w-full rounded-xl bg-text-primary py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90"
            >
              Подробнее о Pro
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10">
        <h2 className="mb-8 text-center font-display text-2xl font-semibold text-text-primary">
          Частые вопросы
        </h2>
        <div className="mx-auto max-w-2xl space-y-3">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-border-strong bg-bg-card px-5 py-4"
            >
              <summary className="cursor-pointer select-none list-none font-medium text-text-primary">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 text-center">
        <h2 className="mb-3 font-display text-2xl font-semibold text-text-primary">
          Готовы попробовать?
        </h2>
        <button
          type="button"
          onClick={goToLogin}
          className="rounded-xl bg-text-primary px-8 py-3 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Начать бесплатно
        </button>
      </section>
    </div>
  );
}
