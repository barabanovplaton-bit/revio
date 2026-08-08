"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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

/* Координаты (в %) внутри демо-окна: точки прямоугольников-карточек */
const DEMO_STEPS = [
  { l: "21%", t: "52%", n: 1, text: "Увеличь логотип" },
  { l: "50%", t: "52%", n: 2, text: "Поправить отступы" },
  { l: "79%", t: "52%", n: 3, text: "Заменить цвет" },
];

const CURSOR_ORIGIN = { l: "3%", t: "5%" };

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: "easeOut" },
  }),
};

function Check({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function DemoMockup() {
  const [pos, setPos] = useState(CURSOR_ORIGIN);
  const [clicking, setClicking] = useState(false);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((r) => timers.push(setTimeout(r, ms)));

    (async () => {
      await wait(400);
      while (alive) {
        // плавно скользим от исходного угла к первой точке
        for (const s of DEMO_STEPS) {
          if (!alive) return;
          setPos({ l: s.l, t: s.t });
          await wait(820); // скольжение (~0.8с)
          if (!alive) return;
          // микро-клик
          setClicking(true);
          await wait(120);
          if (!alive) return;
          setClicking(false);
          await wait(210); // пауза 0.2с -> появится точка + бабл
          if (!alive) return;
          setRevealed((r) => Math.max(r, s.n));
        }
        // все 3 висят 3 секунды
        await wait(3000);
        if (!alive) return;
        // плавное исчезновение, курсор возвращается
        setRevealed(0);
        await wait(650);
        if (!alive) return;
        setPos(CURSOR_ORIGIN);
        await wait(900);
      }
    })();

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2rem] bg-accent/40 blur-3xl" />

      <div className="relative rounded-2xl border border-white/10 bg-bg-card p-4 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border-strong pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 truncate text-xs text-text-muted">
            Раунд 1 · холст правок
          </span>
        </div>

        <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-xl bg-bg-input">
          {/* ---- абстрактный макет сайта ---- */}
          <div className="absolute inset-6">
            {/* шапка */}
            <div className="absolute left-0 right-0 top-0 h-[9%] rounded-md bg-white/10" />
            {/* баннер/заголовок */}
            <div className="absolute left-0 right-0 top-[12%] h-[26%] rounded-md bg-white/[0.06]" />
            <div className="absolute left-[6%] top-[30%] h-[5%] w-[32%] rounded-sm bg-white/[0.08]" />
            {/* 3 карточки */}
            <div className="absolute left-0 right-0 top-[44%] flex h-[34%] gap-[4%]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex-1 rounded-md border border-white/10 bg-white/[0.07]"
                />
              ))}
            </div>
            {/* футер */}
            <div className="absolute bottom-0 left-0 right-0 h-[9%] rounded-md bg-white/[0.09]" />
          </div>

          {/* точки с баблами */}
          {DEMO_STEPS.map((s) => (
            <div key={s.n} className="absolute z-20" style={{ left: s.l, top: s.t }}>
              {/* точка */}
              <div
                className="flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black text-[11px] font-bold text-white shadow-lg transition-all duration-300"
                style={{ opacity: revealed >= s.n ? 1 : 0, scale: revealed >= s.n ? 1 : 0.4 }}
              >
                {s.n}
              </div>
              {/* бабл рядом */}
              <div
                className="translate-x-2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs text-white backdrop-blur-sm transition-all duration-300"
                style={{ opacity: revealed >= s.n ? 1 : 0, transform: revealed >= s.n ? `translate(8px, -50%)` : `translate(8px, -30%)` }}
              >
                {s.n}. {s.text}
              </div>
            </div>
          ))}

          {/* курсор */}
          <div
            className="pointer-events-none absolute z-30"
            style={{
              left: pos.l,
              top: pos.t,
              transform: "translate(-50%, -20%)",
              transition:
                "left 0.8s cubic-bezier(0.4, 0, 0.2, 1), top 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 drop-shadow-lg"
              style={{
                transformOrigin: "30% 30%",
                transform: clicking ? "scale(0.75)" : "scale(1)",
                transition: "transform 0.15s ease",
              }}
            >
              <path
                d="M5 3l7 6-3 6 2-1 1.5 4 2-1.5-1.5-4 3 2.5z"
                fill="#EDEDED"
                stroke="#0A0A0A"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      layout
      className={`overflow-hidden rounded-2xl border bg-bg-card px-5 transition-colors duration-300 ${
        open ? "border-accent/60 bg-accent-soft" : "border-border-strong"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-4 text-left"
      >
        <span className={`font-medium transition-colors ${open ? "text-accent" : "text-text-primary"}`}>
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className={`shrink-0 ${open ? "text-accent" : "text-text-muted"}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <p className="pb-4 text-sm leading-relaxed text-text-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Landing() {
  const router = useRouter();
  const goToLogin = () => router.push("/login");

  return (
    <div className="relative mx-auto w-full max-w-5xl flex-1 px-4 pb-16 md:px-6">
      {/* Hero */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
        className="grid items-center gap-10 py-14 md:grid-cols-2 md:py-20"
      >
        <motion.div variants={fadeUp} custom={0}>
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
              className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-black transition-all hover:opacity-90 active:scale-[0.98]"
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
        </motion.div>

        <motion.div variants={fadeUp} custom={1}>
          <DemoMockup />
        </motion.div>
      </motion.section>

      {/* Как работает */}
      <section id="how-it-works" className="py-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center font-display text-2xl font-semibold text-text-primary"
        >
          Как это работает
        </motion.h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              custom={i}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group rounded-2xl border border-border-strong bg-bg-card p-6 transition-colors hover:border-white/20"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 text-sm font-bold text-text-primary">
                {s.num}
              </div>
              <h3 className="mb-1.5 font-medium text-text-primary">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-muted">
                {s.text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Тарифы */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.2 } } }}
        className="py-10"
      >
        <motion.h2
          variants={fadeUp}
          custom={0}
          className="mb-8 text-center font-display text-2xl font-semibold text-text-primary"
        >
          Тарифы
        </motion.h2>
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div
            variants={fadeUp}
            custom={1}
            className="rounded-2xl border border-border-strong bg-bg-card p-6"
          >
            <h3 className="font-medium text-text-primary">Free</h3>
            <p className="mt-1 text-2xl font-semibold text-text-primary">
              0 ₽
              <span className="ml-1 text-sm font-normal text-text-muted">
                навсегда
              </span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-muted">
              {["До 3 проектов", "До 10 изображений на проект", "До 5 раундов правок"].map(
                (li) => (
                  <li key={li} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{li}</span>
                  </li>
                )
              )}
            </ul>
            <button
              type="button"
              onClick={goToLogin}
              className="mt-6 w-full rounded-xl border border-border-strong py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover"
            >
              Начать бесплатно
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={2}
            className="relative rounded-2xl border-2 border-accent bg-bg-card p-6 shadow-lg shadow-accent/20"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-text-primary">Pro</h3>
              <span className="rounded-lg bg-accent px-2 py-0.5 text-xs font-medium text-white">
                ПОПУЛЯРНЫЙ
              </span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-text-primary">
              299 ₽
              <span className="ml-1 text-sm font-normal text-text-muted">
                /мес
              </span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-muted">
              {["Неограниченные проекты", "Неограниченные изображения", "Неограниченные правки"].map(
                (li) => (
                  <li key={li} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{li}</span>
                  </li>
                )
              )}
            </ul>
            <button
              type="button"
              onClick={() => router.push("/pricing")}
              className="mt-6 w-full rounded-xl border border-accent py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-white"
            >
              Подробнее о Pro
            </button>
          </motion.div>
        </div>
      </motion.section>

      {/* FAQ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        className="py-10"
      >
        <motion.h2
          variants={fadeUp}
          custom={0}
          className="mb-8 text-center font-display text-2xl font-semibold text-text-primary"
        >
          Частые вопросы
        </motion.h2>
        <div className="mx-auto max-w-2xl space-y-3">
          {FAQ.map((f, i) => (
            <motion.div key={f.q} variants={fadeUp} custom={i + 1}>
              <FaqItem q={f.q} a={f.a} />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden py-14 text-center"
      >
        <div className="animate-breath pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30 blur-[100px]" />
        <div className="relative">
          <h2 className="mb-3 font-display text-2xl font-semibold text-text-primary">
            Готовы попробовать?
          </h2>
          <button
            type="button"
            onClick={goToLogin}
            className="rounded-xl bg-white px-8 py-3 text-sm font-medium text-black transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Начать бесплатно
          </button>
        </div>
      </motion.section>
    </div>
  );
}